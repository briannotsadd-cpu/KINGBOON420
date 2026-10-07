import json,sys
def lin(c):
    c/=255; return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def L(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16) for i in (0,2,4)]
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def cr(a,b):
    x,y=sorted([L(a),L(b)],reverse=True); return (x+.05)/(y+.05)
pairs=[("ink","bg",4.5),("ink","surface",4.5),("muted","bg",4.5),("muted","surface",4.5),("primary","bg",4.5),("onPrimary","primary",4.5),("accent","surface",4.5),("ok","surface",4.5),("warn","surface",4.5),("danger","surface",4.5),("unknown","surface",4.5)]
T=json.load(open(sys.argv[1])); fails=0
print("| Direction | Mode | fg on bg | ratio | AA 4.5 |"); print("|---|---|---|---|---|")
for d,m in T.items():
    for mode,c in m.items():
        for f,b,t in pairs:
            r=cr(c[f],c[b]); ok=r>=t; fails+=not ok
            print(f"| {d} | {mode} | {f} {c[f]} on {b} {c[b]} | {r:.2f} | {'PASS' if ok else 'FAIL'} |")
print(f"\nFAILS: {fails}")
