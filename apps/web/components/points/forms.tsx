"use client";
import { useActionState } from "react";
import { Check, Gift, Plus, Save, Undo2, X } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import {
  awardPointsAction, decideRedemptionAction, redeemRewardAction, reviewHoldAction, saveRewardAction, type PointsState,
} from "@/app/temple/[id]/points-actions";
import { aria, err, kv, useRefreshOnOk } from "./flash";
import type { Member, RewardRow } from "./queries";

const Msg = ({ s }: { s: PointsState }) => (<>
  {s.error && <Notice kind="error">{s.error}</Notice>}
  {s.ok && <Notice kind="ok">{s.ok}</Notice>}
</>);

/** Manual award. The form stays mounted; the request id changes with every page refresh, so a retry of the same form is idempotent. */
export function AwardForm({ templeId, requestId, members, meId }: { templeId: string; requestId: string; members: Member[]; meId: string | null }) {
  const [s, act] = useActionState(awardPointsAction, {});
  useRefreshOnOk(s);
  return (
    <form action={act} className="stack" noValidate data-testid="award-form">
      <Msg s={s} />
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="request" value={requestId} />
      <Field id="person_id" label="มอบแต้มให้ใคร" required hint="รายชื่อสมาชิกฆราวาสของวัดที่คุณมีสิทธิ์เห็น" error={err(s, "person_id")}>
        <select key={kv(s, "person_id")} id="person_id" name="person_id" className="input" defaultValue={s.values?.person_id ?? ""} {...aria(s, "person_id")}>
          <option value="">— เลือกคน —</option>
          {members.map((m) => <option key={m.person_id} value={m.person_id}>{m.display_name}{m.person_id === meId ? " (ตัวคุณเอง)" : ""}</option>)}
        </select>
      </Field>
      <Field id="amount" label="จำนวนแต้ม" required hint="ครั้งละ 1–50 แต้ม ตัวอย่าง: 20" error={err(s, "amount")}>
        <input id="amount" name="amount" inputMode="numeric" autoComplete="off" className="input" defaultValue={s.values?.amount} {...aria(s, "amount")} />
      </Field>
      <Field id="reason" label="เหตุผลที่มอบ (ผู้รับจะเห็นข้อความนี้)" required hint="ตัวอย่าง: ช่วยจัดสถานที่งานบุญวันเสาร์" error={err(s, "reason")}>
        <textarea id="reason" name="reason" className="input" defaultValue={s.values?.reason} {...aria(s, "reason")} />
      </Field>
      <SubmitButton pendingText="กำลังมอบแต้ม…" block><Plus aria-hidden />มอบแต้ม</SubmitButton>
    </form>
  );
}

/** Approve / reject a held award. The row leaves the list, so the message goes to the page-level flash. */
export function HoldActions({ templeId, holdId }: { templeId: string; holdId: string }) {
  const [s, act] = useActionState(reviewHoldAction, {});
  useRefreshOnOk(s, true);
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="hold_id" value={holdId} />
      <div className="btn-row" style={{ marginTop: 0 }}>
        <SubmitButton name="decision" value="accept" pendingText="กำลังบันทึก…" variant="secondary"><Check aria-hidden />อนุมัติ</SubmitButton>
        <SubmitButton name="decision" value="reject" pendingText="กำลังบันทึก…" variant="secondary"><X aria-hidden />ไม่อนุมัติ</SubmitButton>
      </div>
    </form>
  );
}

export function RedeemForm({ templeId, reward }: { templeId: string; reward: RewardRow }) {
  const [s, act] = useActionState(redeemRewardAction, {});
  useRefreshOnOk(s, true);   // the card disappears when the last item is taken, so the success message goes to the page-level flash
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="reward_id" value={reward.id} />
      <SubmitButton pendingText="กำลังขอรับ…" variant="secondary" block><Gift aria-hidden />ขอรับของชิ้นนี้ (ใช้ {reward.cost.toLocaleString("th-TH")} แต้ม)</SubmitButton>
    </form>
  );
}

/** Member cancels their own request: the row stays in "my requests", so this form stays mounted. */
export function CancelRedemption({ templeId, redemptionId, open }: { templeId: string; redemptionId: string; open: boolean }) {
  const [s, act] = useActionState(decideRedemptionAction, {});
  useRefreshOnOk(s);
  return (
    <form action={act} className="stack" noValidate>
      <Msg s={s} />
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="redemption_id" value={redemptionId} />
      <input type="hidden" name="op" value="cancel" />
      {open && <SubmitButton pendingText="กำลังยกเลิก…" variant="secondary"><Undo2 aria-hidden />ยกเลิกคำขอ และรับแต้มคืน</SubmitButton>}
    </form>
  );
}

/** Staff: fulfil or cancel. The row leaves the REQUESTED list, so the message goes to the page-level flash. */
export function ManageRedemptionActions({ templeId, redemptionId }: { templeId: string; redemptionId: string }) {
  const [s, act] = useActionState(decideRedemptionAction, {});
  useRefreshOnOk(s, true);
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="redemption_id" value={redemptionId} />
      <div className="btn-row" style={{ marginTop: 0 }}>
        <SubmitButton name="op" value="fulfil" pendingText="กำลังบันทึก…" variant="secondary"><Check aria-hidden />มอบแล้ว</SubmitButton>
        <SubmitButton name="op" value="cancel" pendingText="กำลังบันทึก…" variant="secondary"><X aria-hidden />ยกเลิก (คืนแต้ม)</SubmitButton>
      </div>
    </form>
  );
}

/** Add (reward undefined) or edit a reward. Stays mounted. */
export function RewardForm({ templeId, reward }: { templeId: string; reward?: RewardRow }) {
  const [s, act] = useActionState(saveRewardAction, {});
  useRefreshOnOk(s);
  const p = reward?.id ?? "new";
  const v = (k: string, d: string) => s.values?.[k] ?? d;
  const activeNow = s.values?.active ? s.values.active === "1" : (reward?.active ?? true);
  return (
    <form action={act} className="stack" noValidate data-testid={reward ? `reward-edit-${reward.id}` : "reward-new"}>
      <Msg s={s} />
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="reward_id" value={reward?.id ?? ""} />
      <Field id={`${p}-name`} label="ชื่อของที่ระลึก" required hint="ตัวอย่าง: ผ้ารัดข้อมือพร้อมพรวัด" error={err(s, "name")}>
        <input id={`${p}-name`} name="name" className="input" defaultValue={v("name", reward?.name_th ?? "")} />
      </Field>
      <Field id={`${p}-description`} label="คำอธิบาย" error={err(s, "description")}>
        <textarea id={`${p}-description`} name="description" className="input" defaultValue={v("description", reward?.description ?? "")} />
      </Field>
      <Field id={`${p}-cost`} label="แต้มที่ใช้" required hint="ตัวอย่าง: 15" error={err(s, "cost")}>
        <input id={`${p}-cost`} name="cost" inputMode="numeric" autoComplete="off" className="input" defaultValue={v("cost", reward ? String(reward.cost) : "")} />
      </Field>
      <Field id={`${p}-stock`} label="จำนวนที่มีให้มอบ" required hint="ตัวอย่าง: 10" error={err(s, "stock")}>
        <input id={`${p}-stock`} name="stock" inputMode="numeric" autoComplete="off" className="input" defaultValue={v("stock", reward ? String(reward.stock) : "")} />
      </Field>
      <Field id={`${p}-limit`} label="จำกัดต่อคน (ชิ้น)" hint="เว้นว่างถ้าไม่จำกัด ตัวอย่าง: 1" error={err(s, "limit")}>
        <input id={`${p}-limit`} name="limit" inputMode="numeric" autoComplete="off" className="input" defaultValue={v("limit", reward?.per_person_limit ? String(reward.per_person_limit) : "")} />
      </Field>
      <label className="check" key={`active:${activeNow}`}>
        <input type="checkbox" name="active" defaultChecked={activeNow} />
        <span>เปิดให้ขอรับ (เอาเครื่องหมายออกถ้าต้องการซ่อนรายการนี้)</span>
      </label>
      <SubmitButton pendingText="กำลังบันทึก…" variant={reward ? "secondary" : "primary"} block>
        {reward ? <><Save aria-hidden />บันทึกการแก้ไข</> : <><Plus aria-hidden />เพิ่มของที่ระลึก</>}
      </SubmitButton>
    </form>
  );
}
