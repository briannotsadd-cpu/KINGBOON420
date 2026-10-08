import "server-only";
import { asUser } from "@/lib/db";
import { readPolygon, type Pt } from "@/lib/map";

export interface MapAccess { name_th: string | null; slug: string | null; is_member: boolean; can_manage: boolean; can_confirm: boolean }
export interface MapBuilding {
  id: string; code: string; name_th: string; kind: string; status: string; visibility: string; polygon: Pt[] | null; confirmed: boolean;
  events_today: number | null; open_quests: number | null;
}
export interface MapZone { id: string; building_id: string | null; code: string; name_th: string; kind: string; status: string }

/** Who the signed-in person is for this temple. Temples are visible to their members only (RLS), so a stranger gets nulls. */
export const mapAccess = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<MapAccess>(
    `select (select name_th from public.temples where id = $1) as name_th, (select slug from public.temples where id = $1) as slug,
            app.is_member($1) as is_member, app.has_permission($1, 'asset.manage', 'T') as can_manage,
            app.has_permission($1, 'temple.settings', 'T') as can_confirm`, [templeId])).rows[0]);

/** app.map_buildings runs as the viewer: RLS decides which buildings (and which quests) they see. */
export const mapBuildings = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<{
    id: string; code: string; name_th: string; kind: string; status: string; public_visibility: string; polygon2d: unknown; confirmed: boolean;
    events_today: string | null; open_quests: string | null;
  }>("select * from app.map_buildings($1)", [templeId])).rows.map((r): MapBuilding => ({
    id: r.id, code: r.code, name_th: r.name_th, kind: r.kind, status: r.status, visibility: r.public_visibility, polygon: readPolygon(r.polygon2d),
    confirmed: r.confirmed, events_today: r.events_today === null ? null : Number(r.events_today), open_quests: r.open_quests === null ? null : Number(r.open_quests),
  })));

export const mapZones = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<MapZone>(
    "select id, building_id, code, name_th, kind, status from public.zones where temple_id = $1 and status <> 'RETIRED' order by code", [templeId])).rows);
