# Reference generator for the Ultima palette. Decided on ULT-10; see docs/spec/ultima.md, Palette.
# Run: python3 packages/tokens/scripts/palette.py [-v]   (writes palette.json beside itself)
# The v0 build ports this recipe to the tokens package; until then this file is the source of the values.
import math, json, sys, os

# ---------- color math ----------
def lin_to_srgb(c): return 12.92*c if c<=0.0031308 else 1.055*c**(1/2.4)-0.055
def srgb_to_lin(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def oklch_to_rgb(L,C,H):
    a=C*math.cos(math.radians(H)); b=C*math.sin(math.radians(H))
    l_=L+0.3963377774*a+0.2158037573*b
    m_=L-0.1055613458*a-0.0638541728*b
    s_=L-0.0894841775*a-1.2914855480*b
    l,m,s=l_**3,m_**3,s_**3
    r=+4.0767416621*l-3.3077115913*m+0.2309699292*s
    g=-1.2684380046*l+2.6097574011*m-0.3413193965*s
    b=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    return r,g,b
def in_gamut(rgb): return all(-1e-4<=c<=1+1e-4 for c in rgb)
def oklch_to_hex(L,C,H):
    # reduce chroma until in sRGB gamut
    lo,hi=0.0,C
    if not in_gamut(oklch_to_rgb(L,C,H)):
        for _ in range(40):
            mid=(lo+hi)/2
            if in_gamut(oklch_to_rgb(L,mid,H)): lo=mid
            else: hi=mid
        C=lo
    rgb=[min(1,max(0,c)) for c in oklch_to_rgb(L,C,H)]
    return '#'+''.join(f'{round(lin_to_srgb(c)*255):02x}' for c in rgb)
def lum(h):
    h=h.lstrip('#'); r,g,b=[srgb_to_lin(int(h[i:i+2],16)/255) for i in (0,2,4)]
    return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b):
    la,lb=lum(a),lum(b); return (max(la,lb)+0.05)/(min(la,lb)+0.05)

# ---------- scale recipes ----------
HUE={'mithril':276,'arcane':275,'mana':204,'verdant':162,'ember':79,'ruin':21}
PEAK={'mithril':{'dark':0.055,'light':0.020},'arcane':{'dark':0.17,'light':0.19},'mana':{'dark':0.12,'light':0.12},
      'verdant':{'dark':0.13,'light':0.14},'ember':{'dark':0.13,'light':0.14},'ruin':{'dark':0.15,'light':0.17}}
# lightness per step, 1..12. Steps 1-8 shared; 9-12 per scale.
L_DARK_BG=[0.162,0.195,0.235,0.275,0.315,0.36,0.42,0.50]
L_LIGHT_BG=[0.995,0.982,0.960,0.935,0.905,0.870,0.820,0.740]
L_TOP={ # steps 9 solid, 10 solid hover, 11 solid active, 12 text
 'mithril':{'dark':[0.60,0.66,0.78,0.93],'light':[0.56,0.50,0.44,0.22]},
 'arcane': {'dark':[0.70,0.75,0.80,0.86],'light':[0.55,0.50,0.46,0.40]},
 'mana':   {'dark':[0.80,0.85,0.89,0.912],'light':[0.55,0.50,0.46,0.42]},
 'verdant':{'dark':[0.76,0.81,0.85,0.88],'light':[0.54,0.49,0.45,0.42]},
 'ember':  {'dark':[0.80,0.84,0.88,0.90],'light':[0.78,0.72,0.66,0.45]},
 'ruin':   {'dark':[0.66,0.71,0.76,0.82],'light':[0.58,0.53,0.48,0.42]},
}
L78={'mithril':{'light':(0.78,0.64)}}
CF_OVR={'mithril':{'dark':[0.4,0.6,0.8,0.9,1,1,1,1,1,1,0.8,0.4],'light':[0.3,0.45,0.6,0.7,0.85,1,1,1,1,1,1,1]}}
CF={'dark':[0.15,0.25,0.4,0.5,0.6,0.7,0.8,0.9,1,1,0.9,0.75],
    'light':[0.05,0.12,0.25,0.35,0.45,0.55,0.65,0.8,1,1,1,0.8]}
PIN={('mithril','dark',1):'#0b0d17',('mana','dark',12):'#8ff5ff'}

def build():
    out={}
    for name,h in HUE.items():
        out[name]={}
        for mode in ('dark','light'):
            Ls=list(L_DARK_BG if mode=='dark' else L_LIGHT_BG)+L_TOP[name][mode]
            if name in L78 and mode in L78[name]: Ls[6],Ls[7]=L78[name][mode]
            cf=CF_OVR.get(name,{}).get(mode,CF[mode])
            steps=[]
            for i,L in enumerate(Ls):
                pin=PIN.get((name,mode,i+1))
                steps.append(pin or oklch_to_hex(L,PEAK[name][mode]*cf[i],h))
            out[name][mode]=steps
    return out

# ---------- semantic mapping ----------
HUES=['arcane','mana','verdant','ember','ruin']
ROLE={'accent':'arcane','highlight':'mana','success':'verdant','warning':'ember','danger':'ruin'}
def semantic(p,mode):
    m=lambda s,i:p[s][mode][i-1]
    t={'surface':m('mithril',1),'surface-raised':m('mithril',2),'surface-sunken':m('mithril',3),'surface-hover':m('mithril',4),
       'text':m('mithril',12),'text-muted':m('mithril',11),'text-subtle':m('mithril',10),'text-inverse':m('mithril',1),
       'border':m('mithril',6),'border-strong':m('mithril',8),'border-focus':m('arcane',9)}
    for role,s in ROLE.items():
        t[role]=m(s,9); t[role+'-hover']=m(s,10); t[role+'-active']=m(s,11); t[role+'-subtle']=m(s,3); t[role+'-text']=m(s,12)
        # contrast on-color: mithril1 unless it fails on any of base/hover/active, then mithril12
        cands=[('mithril1',m('mithril',1)),('mithril12',m('mithril',12))]
        best=max(cands,key=lambda c:min(cr(c[1],t[role]),cr(c[1],t[role+'-hover']),cr(c[1],t[role+'-active'])))
        t[role+'-contrast']=best[1]; t[role+'-contrast@step']=best[0]
    return t

def gate(t,mode):
    fails=[]; rows=[]
    def chk(fg,bg,minr,label):
        r=cr(t[fg],t[bg]); rows.append((mode,fg,bg,round(r,2),minr)); 
        if r<minr: fails.append((mode,fg,bg,round(r,2),minr))
    for fg in ('text','text-muted','text-subtle'):
        for bg in ('surface','surface-raised','surface-sunken','surface-hover'): chk(fg,bg,4.5,'text')
    for bg in ('surface','surface-raised'):
        chk('border-strong',bg,3,'border'); chk('border-focus',bg,3,'focus')
    for role in ROLE:
        for bg in ('surface','surface-raised',role+'-subtle'): chk(role+'-text',bg,4.5,'hue text')
        for bg in (role,role+'-hover',role+'-active'): chk(role+'-contrast',bg,4.5,'on-color')
    return rows,fails

if __name__=='__main__':
    p=build()
    for name in p:
        for mode in p[name]:
            print(f'{name:8}{mode:6}'+' '.join(p[name][mode]))
    allfails=[]
    for mode in ('dark','light'):
        t=semantic(p,mode); rows,fails=gate(t,mode); allfails+=fails
        print(f'\n{mode} contrast tokens: '+', '.join(f"{r}-contrast={t[r+'-contrast@step']}" for r in ROLE))
        if '-v' in sys.argv:
            for r in rows: print('  ',r)
    print('\nFAILS:' if allfails else '\nALL PAIRINGS PASS')
    for f in allfails: print('  ',f)
    json.dump({'palette':p,'semantic':{m:semantic(p,m) for m in ('dark','light')}},open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'palette.json'),'w'),indent=1)
