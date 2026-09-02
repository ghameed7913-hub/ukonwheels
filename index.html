<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UK On Wheels — Connected Portal</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<style>
:root{--navy:#0a0a0d;--navy2:#161619;--blue:#e2131f;--blue-dark:#b30f19;--bg:#f5f5f7;--line:#e7e7ea;--text:#17171a;--muted:#75757e;--green:#12875a;--amber:#c7860f;--red:#d9363e;--purple:#3a3a42;--silver:#c9cad0}
*{box-sizing:border-box}body{margin:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:'Inter',sans-serif;letter-spacing:-.01em}
button,input,select,textarea{font:inherit}.hidden{display:none!important}.btn{border:0;border-radius:9px;padding:11px 16px;font-weight:700;cursor:pointer;font-size:13px;transition:.15s}.primary{background:var(--blue);color:#fff}.primary:hover{background:var(--blue-dark)}.secondary{background:#f1f1f3;color:#26262b}.secondary:hover{background:#e7e7ea}.danger{background:#fdeaec;color:#b31d2c}.warn{background:#fdf1dc;color:#8a5c07}
.login{min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 20% 15%,#1c1c20 0%,#0a0a0d 55%,#050506 100%);position:relative;overflow:hidden;padding:24px}
.login:before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 40%,#e2131f14 55%,transparent 70%);pointer-events:none}
.login-card{width:min(440px,100%);background:#fff;border-radius:20px;padding:34px 32px;box-shadow:0 30px 90px #000a;position:relative;z-index:1}
.loginLogo{display:block;max-width:220px;margin:0 auto 14px}
.logo{font-size:22px;font-weight:900;text-align:center;margin-bottom:4px;letter-spacing:-.02em}.logo span{color:var(--blue)}
.login-card p.tagline{text-align:center;color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin:0 0 22px}
.roles{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}
.roles button{background:#f4f4f6;color:#3a3a42;border:1px solid var(--line);border-radius:10px;padding:10px 6px;font-size:12px;font-weight:700;transition:.15s}
.roles button.active{background:var(--navy);color:#fff;border-color:var(--navy)}
.login-card input{width:100%;padding:13px 14px;margin:6px 0;border:1px solid var(--line);border-radius:10px;background:#fafafb;font-size:14px}
.login-card input:focus{outline:none;border-color:var(--blue);background:#fff}
.login-card .btn{width:100%;margin-top:10px;padding:13px;font-size:14px;border-radius:10px}
.login-card .btn.primary{background:var(--blue);box-shadow:0 8px 20px #e2131f33}
.demo{font-size:12px;color:var(--muted);line-height:1.6;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}
.demo code{background:#f4f4f6;padding:1px 5px;border-radius:4px}
.shell{display:flex;min-height:100vh}
.sidebar{position:fixed;inset:0 auto 0 0;width:258px;background:var(--navy);color:#fff;padding:0 12px 16px;overflow:auto;border-right:1px solid #ffffff10}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px;padding:18px 6px 16px;border-bottom:1px solid #ffffff14;letter-spacing:-.01em}
.brand img{width:34px;height:34px;border-radius:8px;object-fit:cover;flex:none}
.brand span{color:var(--blue)}
.brand small{display:block;color:#9a9aa2;font-weight:600;font-size:10px;letter-spacing:.06em;text-transform:uppercase;margin-top:2px}
.nav{display:grid;gap:2px;margin-top:12px}
.nav button{background:transparent;color:#c6c6cd;text-align:left;padding:10px 12px;border-radius:9px;font-size:13px;font-weight:600;border-left:3px solid transparent;transition:.15s}
.nav button:hover{background:#ffffff0d;color:#fff}
.nav button.active{background:linear-gradient(90deg,#e2131f22,transparent);color:#fff;border-left:3px solid var(--blue)}
.main{margin-left:258px;width:calc(100% - 258px)}
.top{height:70px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 26px;position:sticky;top:0;z-index:3}
.top h2{font-size:17px;font-weight:800;letter-spacing:-.01em}
.content{padding:24px}
.notice{background:#fff7e6;border:1px solid #f4d38a;border-radius:10px;padding:12px 15px;margin-bottom:16px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px}
.card,.panel{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px}
.card b{font-size:11px;color:var(--muted);display:block;text-transform:uppercase;letter-spacing:.03em;font-weight:700}
.card strong{font-size:26px;display:block;margin-top:6px;font-weight:800;letter-spacing:-.02em}
.tabs{display:flex;gap:7px;overflow:auto;margin-bottom:14px}
.tabs button{white-space:nowrap;background:#fff;border:1px solid var(--line);color:#52657d;border-radius:9px;padding:9px 14px;font-weight:600;font-size:13px}
.tabs button.active{background:var(--navy);color:#fff;border-color:var(--navy)}
.badge{display:inline-block;padding:5px 9px;border-radius:20px;background:#f1f1f3;color:#3a3a42;font-size:11px;font-weight:800}
.green{background:#e6f7ef;color:#0d6b46}.amber{background:#fdf1dc;color:#8a5c07}.red{background:#fdeaec;color:#b31d2c}.purple{background:#eee9f7;color:#3a3a42}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:10px 7px;border-bottom:1px solid #edf1f5;text-align:left}th{font-size:11px;text-transform:uppercase;color:var(--muted)}.scroll{overflow-x:auto}.form{display:grid;grid-template-columns:1fr 1fr;gap:10px}.form input,.form select,.form textarea{width:100%;padding:11px;border:1px solid var(--line);border-radius:8px}.form textarea{min-height:90px}.full{grid-column:1/-1}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.mobile-card{max-width:720px;margin:auto}.step{margin:14px 0;padding:14px;border:1px solid var(--line);border-radius:10px}.step h4{margin:0 0 10px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.event{border-left:4px solid var(--blue);padding:9px 12px;background:#faf7f7;margin:8px 0;border-radius:8px}
.cameraBox{border:1px solid var(--line);border-radius:10px;padding:10px;background:#fafcff}
.cameraBox video{width:100%;border-radius:8px;background:#000;display:none}
.cameraBox canvas{width:100%;border-radius:8px;display:none}
.cameraBox .camActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
.cameraBox .camActions button{flex:1;min-width:120px}
.captureMeta{font-size:12px;margin-top:7px;color:var(--muted);line-height:1.45}
.muted{color:var(--muted)}@media(max-width:800px){.sidebar{position:relative;width:100%}.shell{display:block}.main{margin-left:0;width:100%}.form,.grid2{grid-template-columns:1fr}.content{padding:14px}}

.clientHero h1{margin:0;font-size:28px}.clientHero p{margin:6px 0 0;color:var(--muted)}
.clientStats{display:grid;grid-template-columns:repeat(8,1fr);background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:14px;overflow:hidden}
.clientStat{text-align:center;padding:18px 8px;border-right:1px solid var(--line);cursor:pointer}.clientStat:last-child{border-right:0}.clientStat .ico{font-size:25px}.clientStat b{display:block;font-size:12px;margin:8px 0}.clientStat strong{font-size:24px}.clientStat small{display:block;color:var(--muted);margin-top:5px}
.clientCharts{display:grid;grid-template-columns:1.15fr 1.1fr 1.1fr;gap:12px}.clientBottom{display:grid;grid-template-columns:1.3fr 1fr;gap:12px;margin-top:12px}
.chartBox{height:245px;position:relative}.bars{height:180px;display:flex;align-items:end;gap:7px;border-bottom:1px solid var(--line);padding:0 10px}.bars i{display:block;flex:1;background:var(--navy);border-radius:3px 3px 0 0}
.donut{width:170px;height:170px;border-radius:50%;margin:18px auto;background:conic-gradient(#e2131f 0 19%,#0a0a0d 19% 32%,#8a8a92 32% 43%,#c9cad0 43% 48%,#3a3a42 48% 87%,#b30f19 87% 91%,#e2131f 91% 94%,#0a0a0d 94%);display:grid;place-items:center}.donut:after{content:"Total\A Vehicles";white-space:pre;text-align:center;display:grid;place-items:center;width:88px;height:88px;background:white;border-radius:50%;font-weight:800}
.trend{height:180px;display:flex;align-items:flex-end;gap:8px;padding:12px;border-bottom:1px solid var(--line)}.trend span{flex:1;position:relative;height:100%}.trend span:after{content:"";position:absolute;bottom:0;left:45%;width:7px;height:var(--h);background:var(--blue);border-radius:4px}
.safeBanner{margin-top:12px;background:linear-gradient(90deg,#f8f8f9,#f1f1f3);border:1px solid var(--line);border-radius:12px;padding:16px 20px;font-weight:700}
@media(max-width:1200px){.clientStats{grid-template-columns:repeat(4,1fr)}.clientCharts{grid-template-columns:1fr}.clientBottom{grid-template-columns:1fr}}
@media(max-width:700px){.clientStats{grid-template-columns:repeat(2,1fr)}}

.adminWelcome{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.adminWelcome .mark{width:72px;height:50px;border-radius:10px;background:var(--navy);color:#fff;display:grid;place-items:center;font-weight:900;border:2px solid #ffffff20}
.adminWelcome .mark span{color:var(--blue)}.adminWelcome h1{margin:0;font-size:27px;font-weight:800;letter-spacing:-.02em}
.adminNotice{display:grid;grid-template-columns:auto 1fr 1.6fr auto;gap:12px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:14px}
.adminNotice .speaker{width:50px;height:50px;border-radius:10px;background:#fdeaec;display:grid;place-items:center;font-size:24px}
.adminNotice input{width:100%;padding:11px;border:1px solid var(--line);border-radius:8px}
.adminStats{display:grid;grid-template-columns:repeat(11,minmax(105px,1fr));background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:14px;overflow-x:auto}
.adminStat{min-width:108px;text-align:center;padding:16px 8px;border-right:1px solid var(--line);cursor:pointer}
.adminStat:last-child{border-right:0}.adminStat .ico{font-size:23px}.adminStat b{display:block;font-size:11px;margin:8px 0;color:#3f5168}.adminStat strong{font-size:23px}.adminStat small{display:block;color:var(--muted);margin-top:4px;font-size:10px}
.adminGridTop{display:grid;grid-template-columns:1.4fr .9fr;gap:12px}.adminGridBottom{display:grid;grid-template-columns:1fr 1fr 1.15fr;gap:12px;margin-top:12px}
.kpiRow{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:12px}.kpi{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px}.kpi b{font-size:12px;color:var(--muted);display:block}.kpi strong{font-size:24px;display:block;margin:7px 0}
.adminDonut{width:200px;height:200px;border-radius:50%;margin:18px auto;background:conic-gradient(#e2131f 0 17%,#0a0a0d 17% 28%,#8a8a92 28% 40%,#3a3a42 40% 55%,#c9cad0 55% 60%,#b30f19 60% 63%,#0a0a0d 63% 67%,#e2131f 67% 92%,#8a8a92 92% 96%,#3a3a42 96%);display:grid;place-items:center}
.adminDonut:after{content:"Total\A Vehicles";white-space:pre;text-align:center;display:grid;place-items:center;width:105px;height:105px;background:white;border-radius:50%;font-weight:800}
.sidebarGroup{margin:12px 0 4px;padding:5px 8px;color:#8a8a92;font-size:11px;text-transform:uppercase}.subnav{padding-left:22px!important;font-size:12px!important}
.topDest li,.alerts li{padding:9px 0;border-bottom:1px solid #eef2f6;list-style:none}.topDest,.alerts{padding:0;margin:0}
@media(max-width:1350px){.adminStats{grid-template-columns:repeat(6,1fr)}.kpiRow{grid-template-columns:repeat(3,1fr)}}
@media(max-width:1050px){.adminGridTop,.adminGridBottom{grid-template-columns:1fr}.adminNotice{grid-template-columns:auto 1fr}.adminNotice input,.adminNotice button{grid-column:1/-1}}
@media(max-width:700px){.kpiRow{grid-template-columns:repeat(2,1fr)}}

.invoiceSheet{background:#fff;border:1px solid var(--line);border-radius:12px;padding:28px;max-width:1000px;margin:0 auto}
.invoiceHeader{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid var(--navy);padding-bottom:18px;margin-bottom:20px}
.invoiceTitle{font-size:30px;font-weight:900;letter-spacing:.02em}.invoiceMeta{text-align:right}
.invoiceTwoCol{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:18px 0}.invoiceBox{border:1px solid var(--line);border-radius:10px;padding:14px}
.invoiceTotals{margin-left:auto;width:min(420px,100%);margin-top:18px}.invoiceTotals table td{padding:7px}.invoiceTerms{margin-top:22px;padding:15px;background:#f8fafc;border:1px solid var(--line);border-radius:10px;line-height:1.5}
.invoiceBank{margin-top:18px;padding:15px;background:#f5f5f7;border-radius:10px;border:1px solid var(--line)}
@media print{
 body{background:#fff}.sidebar,.top,.noPrint{display:none!important}.main{margin:0!important;width:100%!important}.content{padding:0!important}.invoiceSheet{border:0;box-shadow:none;max-width:none}
}

.evidenceGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.evidenceCard{border:1px solid var(--line);border-radius:10px;padding:10px;background:#fff}
.evidenceCard img{width:100%;height:150px;object-fit:cover;border-radius:8px;border:1px solid var(--line)}
.signaturePad{width:100%;height:150px;border:1px dashed #8fa2b8;border-radius:8px;background:#fff;touch-action:none}
.signatureImage{max-width:360px;width:100%;height:120px;object-fit:contain;border:1px solid var(--line);border-radius:8px;background:#fff}

.driverApp{max-width:520px;margin:0 auto;padding-bottom:88px}
.driverHeader{background:linear-gradient(135deg,#0a0a0d,#26262e 70%,#e2131f22);color:#fff;padding:18px;border-radius:0 0 18px 18px;position:sticky;top:0;z-index:20}
.driverHeader h2{margin:0 0 5px;font-weight:800;letter-spacing:-.01em}.driverHeader small{opacity:.75}
.driverSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.driverSummary div{background:#ffffff18;border:1px solid #ffffff2e;border-radius:10px;padding:10px;text-align:center}
.driverSummary strong{display:block;font-size:22px}
.driverBody{padding:12px}
.driverJob{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:0 3px 12px #0000000a}
.driverJob h3{margin:6px 0}.driverRoute{background:#f7f9fc;border-radius:10px;padding:10px;margin:10px 0}
.driverMeta{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px}
.driverMeta div{background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:8px}
.driverBottomNav{position:fixed;left:50%;transform:translateX(-50%);bottom:0;width:min(520px,100%);background:#fff;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(4,1fr);z-index:50;padding-bottom:env(safe-area-inset-bottom)}
.driverBottomNav button{border:0;background:#fff;padding:10px 4px;font-size:11px;color:#75757e;font-weight:600}.driverBottomNav button.active{color:var(--blue);font-weight:800}
.driverBottomNav span{display:block;font-size:20px;margin-bottom:3px}
.driverSectionTitle{display:flex;justify-content:space-between;align-items:center;margin:8px 0 12px}
.driverPill{padding:4px 8px;border-radius:999px;background:#f1f1f3;font-size:12px;font-weight:600}
.driverEmpty{background:#fff;border:1px dashed var(--line);border-radius:12px;padding:28px;text-align:center;color:var(--muted)}
.driverHolidayCard{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:10px}
.driverProfileCard{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px}
.driverJob .step{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}
.driverJob .grid2{grid-template-columns:1fr}
.driverJob .cameraBox{margin-bottom:10px}
.driverJob video,.driverJob canvas{max-height:240px}
@media(max-width:700px){
 body.driver-mode .sidebar,body.driver-mode .top{display:none!important}
 body.driver-mode .main{margin-left:0!important;width:100%!important}
 body.driver-mode .content{padding:0!important}
 body.driver-mode .app{display:block!important}
}
</style>
</head>
<body>
<div id="login" class="login">
  <div class="login-card">
    <img class="loginLogo" id="loginLogoImg" alt="UK On Wheels">
    <p class="tagline">Car Delivery Across the UK — Connected Portal</p>
    <input id="email" placeholder="Email" autocomplete="username">
    <input id="password" type="password" onkeydown="if(event.key===\'Enter\')loginNow()" placeholder="Password" autocomplete="current-password">
    <button id="signInBtn" class="btn primary" type="button" onclick="loginNow()">Sign In</button>
    <div class="demo" id="loginHint">
      Your role, name and permissions are determined automatically by your account after sign in.
    </div>
  </div>
</div>

<div id="app" class="hidden"></div>

<script>
/* =====================================================================
   SUPABASE SETUP — fill these two values in from your Supabase project:
   Project Settings → API → Project URL, and the "anon public" key.
   ===================================================================== */
const SUPABASE_URL = "https://lxsrdtsxpsfbbjxbdlkm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Qoq3UO_EfhW0Y1x-mA5rew_J8yNcNPX";
const SUPABASE_CONFIGURED = SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length>20;

// Main client — holds the logged-in session (persisted in localStorage by Supabase itself).
const sb = SUPABASE_CONFIGURED ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
// Secondary client used only for creating NEW accounts (staff/client/driver) so that
// signUp() doesn't hijack the currently logged-in admin's session.
const sbAuthOnly = SUPABASE_CONFIGURED ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {auth:{persistSession:false}}) : null;


// Brand logo assets (embedded so the file stays fully self-contained/portable).
const LOGO_ICON = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCADwAPADASIAAhEBAxEB/8QAHQAAAQQDAQEAAAAAAAAAAAAAAAEGBwgCBAUDCf/EAFkQAAEDAwIDBQUCCQcGCA8BAAECAwQABQYHERIhMQgTQVFhFCJxgZEyQhUWI1JicoKhsQkkkqKywdEXM0NUVZM0U2Nkc4Oz0hglJig2OERXdISVo8LT8PH/xAAcAQEBAAIDAQEAAAAAAAAAAAAAAQIEAwUGBwj/xABAEQABAwIDAwcKAwcFAQAAAAABAAIDBBEFEiExQVEGYXGRobHRExQWIjJSgZLB8AcV0jNTYnKCstMjJTTh8UL/2gAMAwEAAhEDEQA/AKbClopK5ViloooNFEUUUUSyKKKKIiik23rLaiJKNt6WlAq2S6x2NLtWXCaOE0UusdqNjWYTQUUS689qKz4TRwmllbrCgVkR6UhFLJdJRQRRUVRRRRREUlLRRRFFFFERSGlpDRVLRSUCiJaKKKIijeigCiI60oFKBWSUmqoSsdqyCN69EorZiRHpDyGGGluuuHhQhCSpSj4AAcyaKLVS2fKsw36VOunXZg1LypDcufCZxuAvn3tyJDpHo0Pe/pcNTviXZM09tCUOZDcLrkUgcyjj9mYJ/VRur+tUuEsqKcAHXYfGtmJb5ksgRIcmQfJppS/4Cvog/ZtE9PUDvbXhVkUjoqWGlPfVwlZriXXtDaTWoFmPlrSwOQRAiOlPy4UgUullRR7Hr7HfjR37HdGnpSuGO2uI4lTx8kAjdR5jpXpKxjJIieKVjt4YT5uQXUj96asJqdrphV81K0/v0CZc5EOwXB2RMW5GKVJSoI24ATzPunyqQInae02UoJVeb2x6riL/ALiat0sqTOtFpXA6hSFeShsf31iW6vtG1h0fyZAYnZHYZQXy7u6RAB8+9Rt++vWXpBo3m0UyYmP2rZfP2qxyu629dkEo+qaIqAlBrEpq2Wa9kZXCuRhWUhZ6iHdm+E/AOoG31SPjVfs/06zPBZXc5Rj8uAhR2bkFPGw7+q4ndJ+G+9LomYU+VYkbVsKRXmpNEuvEik516qFYEUsqCsaWgikqKpaTelooiOtIaXwpN6IlpKKBREtFJQKIlArIDegVmkb1VCUJTXu2gnoKzhRXpUlqNHZceedWENtoSVKWonYAAcySfCrtdm3sxw7MzFyrUeI3KuR2cjWheymo/iC74LX+j0HjuekJsoBdV37P+jdw1UyeTbBdI1pjwW0PS1PDd/u1dC21y4viSANx5je8WDabaY6N2JdxjR4UNTCP5zebk4nvT57uK2CR+inb4VC/amyuyYjrDjeQ6fzEv6gxliLOtsRouNyI/Dslt7h6K8OHrsQeXCKbsvTXULVx9V41UyeUw4pJMO2Qtu6iE9N0/ZG3kNyfFVSxcstAndqt2wMatbj0DBLW5kEpO6RNkbsxQfMD7a/6o9arVnWumqmZLcRcMpkwYi//AGS3fzZsDy933lftE1hqno3l+njipFwhmZZyrZu5RkktegWOravQ8vImmGhr0rsqeia4XvdcL5bLWWhTrhcdUtxxR3UpatyT6mreaFYFj03s7C/P2O2vTlRZqlSXIqFOEoU4B7xG/IAVVJLXpV8OzlFB7I3GRz9iuX9t2riEDYYMwH3ZctC/ylQxp4jvCqSmE2EgBpA/ZFWE0dw+1XHRSfPk2yG+8j2whbsdKiNkbjmRUKBjl0q1GgEcf+Dtd1bdBP8A+yrwuDzF1TbmX278QcObT4SHgW9YdxXzzLPIHbwrYtc+5WiWmXarhLgSEndLsZ5Tah80kGtkte6OXhTu0t0tyrUi7mFj8IiM0oCVOdBDEcfpK8VeSRzP76+hz0rGi7l8IZKSbJ5aa9pbU6yymINwKMsjk8IYlNn2hXolxA4if1gqrL6d666c6isqsE9SLVcZA7t603hCe7dPilKle4v4HY+lQjd42C6UQnLJigbvuRlJRMujoBS0rxA25fsp5eZJptW3Si+5hxXzIg9EZf8AfS8tOzz3kQPBPqfkK886pidL5OLX6L0X5JUR0hqqghjd19rugffVqpe1i7LtivCXrngDjdjuHNRtzyiYjx8kKO5aPpzT+rVRMsxu+YrenrNkNsk26ez9tl5OxI8FA9FJPgRuDViMW1H1A0eebt+Ql/K8OQoIQ6T/ADmInw2J5gD81RKfIpqbrzB081wwNp1a2rpAUCI8xnZMqC4eoG/NJHihXI/Q1z6hdKvngpJrBSakLWTS+/6a3wRbiBLtsgkwLi0khqQkdQfzVjxSenUbjnTAIoi8TWJr0UNqwV0oVQikNG9HrUVS0lHhRREUUm9FREu9KkViKzFUIVkmtiO0t51DbSFLWtQSlKRuVE9AB4mvFAq2PYt0maIb1NySKFJQsixx3E8lKB2VJI8QDuEeoJ8BVWKkfsp6ExcEgx8vyyKh3KJCAqPHWNxbkEdP+lI6n7vQeNeeuetF+u2SO6W6Pj2vIlBSbhc21Du4KRyUlKugUOhX908hurpyO1vrg9ilvXheLyinIZzW8uShXOEyoeB8HFDp+aOfUiqbY/dbrY7o1dLRcZUGc0riS+y4UrB+PiPQ9a5Iad0p0QuDVLWLN5Fpdlrsmdb1fhZe/tft7fEXgTuSlfXYn7yTz8d6tXpBqDieYBuG26LddiOcKQoArP8Ayaui/h19KhTANecWzG2M4trPZWFo+yzeYzZBQrpxLSnmg/pI5eaa6mb6IXG3QUZJglwRk9hcHetOxVhTzaeu/u8lgeaefoK6irirqB5d7TT9/fcvfYd+Q47E2mkAgmAsCNh6b/XXgVbL8Gxn4zkWTHaeYdSUONOICkrSeoIPIj0quOtfZTt9zD9604U3bph3Uu0uq2juH/klH/Nn9E+7+rWhpXr1fMdLdrytL14tyCEB4n+csgep+2B5Hn61Z3EsnsOV2tNysFxZmsHbi4Dsts+Sknmk/GtigxVrzmiNjwXR4/yUrsIdapZdh2OGz/o8x7V8vMgsN2x27vWm+W6TbpzB2cYfQUqHr6jyI5GrwdnMf+aER/zG5f23ak/UrTzEtQrT+D8mtbcgoB7iSj3X2D5oWOY+HMHxBrg49hbenmhV1xRm4LntRIM5bb60BCilfeLAIHLcBW3Lrt4V29fXtqKXLazv+ivP4dAY6xhvpcd4VLRVqdAf/VxvXwnf9lVTi/61ans936RZdCvaYVjn3yWu4PpZiRG+IqPu/aV0SnzJ+QNeBwY5KjMdw8F+hPxH/wBfCWxM2l7e48VAmjugS7naEZnqXLVjmKtpDiW3DwSJY6gAHmhJ89uI+A8ae2U5xcMiaY070lsK7RYti02xEb4X5I8VKI+wk9SSdz94+Fdq8YTrDqllLTuWRjY7ahRKA4tPcx0eSGwolS9vE/MgVPGn2EY5gtq9js0X8ssD2iW5sXnj+kfAeg5CvQ1dXV4m+3sRjrP398F81pKfB+TUIlkIqKk7ADdjOcnefvTaoq0s0DtmNttXfKQzc7uNlIj7cUeOf/zV6nkPAeNdPVq/Y5h9mcuWQzmojR3DKOrjyh91Ceqj+4eO1PzUe45REsTn4n2eHcro5ulv2yUGWWv0leKv1R18xVMNQ9GdbMpvTt6yWRb7jMc6E3BPC2n81CdgEp9BXY0VJFG2wIA7SvI4pilTiMxmqHZj2DmA3KNNVdTLlmEx1iG0q22nfZMdKt1uDzcUOv6o5fHrWlpRnWQYLfRdsekEkAe2QVk91LbHUEeY8xzHUeIrpXjRnUGBuXbQysDqW5bZ/vppzMYya0uh1+1SmFNncKSArYj1G9c07Rb1CtSEtDvXGivPYb7husunLqXY4l2yWAiZDWoB6I8ByIP3Vp6pUORHoSKp1rHp5c9O8pVa5ajJgvgu2+aE7Jktb7b+ix0UnwPoQTtab5nccKvzWXWpCjFKgxeLeDslaSeoHh5pPgrl0NWry20Y9q1pwiKJDao05sSrVOI5xXttgo+QP2Fp8vVIrWjeHi4271zVVK6neAdQRcHcRx8eBuDqFRFQrA108htM+xXqZZ7pGXGmw3lMvtK6pWk7Eeo9fEVzFVmtZYEbGjeg0m9RZJaDRQTURIKDQKSoiyArMVgms09ayCFP7QrAntRNQ4NhJW3ARvJuL6f9FHRtxbHzVuEj1UKuxq1nNt0106eujMdhoRmkxLVBTySpfDs22B+akDc+iTTB7JeIpxbS5F7ktBNzyNQkkke8iKkkMp/aPEv5p8qjfVnOrZkOu8Vq4svTsdxRZAjNEbSJQ5qJ35bBQA+CD51HvaxuZxsFyU9PJUyCKIXcdybEPQjWDM5zuQT4Ef2q5K9pddmzUIWor97mnmR16bculOu1dkbUmRsZFyxuLv5ynFkfRunwrtIPM8rbijIP50mWVfuSkfxrRldo7PXtxEbtEJPh3cYrI+a1H+Fa/wCexQizD2L01PyGxWp2tDelw+l1hB7GuUkAysysrQ8e7jur/jtUn6SaBZtpxPEiyaqd2wtQVIgm1lyM98Ul3kf0hsfWoYn63alzd+8yuS0PJhttv+ykGm7ctQMvn7+2ZVeXgeoVNc2+m9a8vKZ7xlsSOgLuYfwxqB60s7B0Zj4K4WqOkmG5ePbZqm7Pc+RXNjcKO88+NJ5K+PX1pjWDTXA8IuibnG1akW6W31U3Ojt8Q8lJO/EPQg1VWfd33QXJcx1weKnXSf3k1wZmTWpjcGUHFeTY4v39K6oTiZ+dkOvx+i9CcLkw+m83qMStHwIbs4esTpzL6ETdY9N4DIS/mUCQpI2KmQpwqPn7iSPpTHzntBafycbuttgSLjMelQ3WGyiIUp4lIKQSVEctz5VS233G8XlfBYsYvF0Uens8da9/6INOWDp5rTckhULTG8ICuhfYU3/bKa3s9a8WygffSvLtpeTFK8OM73kcBp/b9Vpl41JOA62ZNhGKJsFlh2wtpeW93z7alrJVtuNgoDwprs6I9oB/3k4Khvf8+WwP4uVjI0S1+YSSvAg4B/xcphR/c5WnFh1REczDY9K9FW8sMGrmeTqGlzb3sRpfrTxn9ojUyRvw3iLFHkzCbH8QTXDl63akv78eYTk/qBCP4JFM65abaywElUzTO+FI6liOpwf1OKmheEX+0qKbzjl2thH+sxVt/wBoCuU0tUdrj1rSbjuAtFoomD+geCkqXq3qA5vx5jeD8JJH8K5j+qedDffLLqrf858q/jUZKvDauhX9K8XbilQ+0fpXIymmG0lalTjdA8WaxvUPBP8AmanZk4NnL++4P00IV/EVwbjnF8lAiS8y8PHdoDf6bU1XJYV96vBbvF41vRtkbtJXlqypp5fZYPgAutbbylq9mTJaSY0gd3JaH2VJPU7efj8qm7s8ZY7i+UPYHcXyu23Al+1OKPJLhG/CPRQH9IetV1J3NOtiY7NxiPKZcU3cbO6FMupPvBIO4+m39Wj3GKVsm46H6H6fFZ0bWV1HJSn2mXez4e234j1hzg8Spw7WOJIuFsj51Aa/nUUIiXThH22+jLx9QfyZPlwVWk1cXFb/AAM2wZl6clKot1hqjzmx90kcLg+IUOIfAGqkZLapFiv8+zS+b8KQtlZHRXCdgoehHMfGt9y86NVzlGsaU0lYLJLvSGiioiKKKKIsk139P8feyvNrNjjBKVXGY2wpQ+4gn31fJO5+VN8Gpq7IttS5nVzv7id02m3L7s+TrxDQ/qFw/Kqis1qVk0TEcFut3hoSyxbofdQmvBOwDbKfl7v0ql1iK24fevqK35Ci84o9VE+J/wD7xqaO1Rfg7jtmx5L3d+3zuN4k7Du0Dx9N1g/Ko+j3zTazJAcYk3V1H3U7qH8Up/jWvWQumAY02C7nAsQhw+YzyAk2sLdq5jb53AHM+Vdy2WLI7kB7DZZ7yT94MqCfqeVdCzaqOcfdYbpyt9zfZJZa4lfRCCf313+PtGZepEG14NcLUiQQkSFxVMhA8+8dOwHrtWi3Cmf/AE7qXpJOXUwFoo+s/QeKaV+sk3H4wfyCbb7XuN0NOyQt1fwQjiV/dXKw2xZ1qDcVQcExyXcAlXCuUUcLTfqpatkJ+BO9WR0s7K1jgyU3zU66O5JdFELXDQ4oRkq/TWffd/qj40dqy/as4rbI1j0zsgtGHIjgLlWNj8uhXihQQN2k+RSOf53hXOzD4Ga2v0rqanldidQC3Pl6NO3UqNpeiuAYMlErXDU9BuGwULHZT3r59CdiR/RSPWhnVPTfEwBp3odawlH2LlkrwcdV+lwq4iPkqq6uyp8d9999MhM10++68CV+p3Vz3J8a0XXXXl8bri3FealEmtsAAWC84+R8ji55uTvOqsu/2tdUGDwREYTDaT9llmI4pI/r107D20cwYc7nI8bs8+Or3Vu25xcd5I808XGN/lVU638eiQZ96ixLndW7VCccAfmLaU4Gk+J4U81HyH8OtFirX3XIM11Stki6aN6x5DIntILsnF7i63FnISBue5W2EpdA9Prudqr1cdRtUItyeiXfNMvYlMrLbzLlzfbcbUDzBBO4NShaMU0DhNsy7Bq1e7ff2NlxJ6iGktPDorh7sEDfw49/Wuhc38Z1uiysey25WS0an2psiFf2XkJhXxpI3AcUPdCtttj1HlyKRbWUUb2PUzMQQUah5kyoeKbw5/eTUgWPVHUBSAhjVW+c+RTPjsy0H4haedQqzgOarmuRo+O3B11pZQotN8SSQdjsociPUHY05rXphqmdu7xaX+2+0j+0sVkCN6hBUoXB+RfmivKtPMNzRhX2pVmT+Cbmn9L3NkrPpsaan+TbGcjfcj6XZnIgXgH38YycJiS+L81t3/NunyHumtuy6e6vRikpx+Ojb/jL1DR/F2nFc9P9Qb/BRFyDEsclhA2beXk0Nt5o+aVhRI+HMelRzWELOOSSN2ZpseZQfeoWQYzenbNmMF60TW/tNS7YhR28/Dceo3BrZhRLfO/zU/EH1fmPF2Go/NSUoH1qwWL4jqk7aU4vqFAxPNMYTullm4ZHH9thDoCxJB4kkDwO6TttsBTczLsmXxV077Bsjsk63PJ40MTp6ESWCf8ARqKOJC9vzgRv5CuAwxnd9FvNxOrbtffps7vuozbwG8ymDIj4JKuLG2/eWSeiaPo2V1wZVutFvkLjS1X+xvHkpuVHIPwI5GpDndmDXGzKEuFj6JCkc0uQLk0VD1HvA1oXDMdd9PUpgZUi9GEPd9myKAJkdY8gX0qG36prA043OI+N++62I8YeDd8THf0hvazKe1cXF5t3tEVUPGc0hiOtZcLDyAASdtzsoE+A6VpZjasqv91Vd7hGiuyVNobUuNskOBKQkKI89gPpTuteoukmREMahaTxbe6o7KuWLPKiqT5nuFEoP1+VPezaG2TMYTlx0O1ZYuK0J41Wi67syGx5HYfLco29axLKlvsvv0jwt3LairMGlNp6ZzOdj/o/N/cFW2bbZ0NREmK61+sgitMgjrUwZjE1A09liBqBib8dpR4USOAFp39VY3Qr4b71x/wXi+TMqctyhGk7blKBwkfFHj8q4TXSQ/t2WHEajxXZR8maTEh/tVSHO9x4yO+G0H4FRvRXYyDHbhZl7vo42SdkvI5pP+B+Ncet+OVkjczDcLytZRT0UphqGFrhuKKKKKzWtZFSdphnkXCsDu7MNoyb3cp7XdtbHhS22hWylHx3U4dkjmdvCoxqddK14xpBi0XUfK7a1ecruKC7jNnd+ww3vsJjw8ASDweJ23HXdNvZSy7Vn0IzvNYKc11YyqHhtl4eJt26KCXQg89ktEpDYPkognyNZqsXZGx9Xs87LMtyZ9HJbkRsobJ9PcTy+BNQrqTqDl2od7Xd8rvD853c90zvwssD81tA5JH7z4k01qxJuqrOxV9jx9IQiZm1s3P2uJ3+4KrcRiHZ9uA3xXXnILM6fsJmPqQkH9pDf8aqt4UVEVpntKdUUN9/p7rkzkbY5pbZvbjTh9AAtSfqRTHyfLO0lgLh/Dt3yiE2k8n3tn2T/wBZspJ+tQmy44y4HGnFtrSdwpKtiPnTwx/VPUOxI7q3ZfdQxtsWH3u/aI8ihziTt8qt1E6onaH1cW4G38rjPBXVUu2x1j5/kyadVl11ypYH4WzHCWh4g4uXlf1WUj99RJfMuiZBxOXrF7SmWrmZdtR7G4o+akJ3aP8AQB9aarnB3iu74uDf3eLrtUVVtbXr7jUcg3TJ7VM2HNMXAm07/NT4/hXej9p3SmOB7RZZ84j8ywRWQf8A7hqlVLVupZXXV2stKW+Ten9xdHrCip3/AK1ea+11poBs3pbJX+siMn+41Sz41MenWJYDiuNRc51cVLlNzU95ZsciK4XpyAdu+dVuChokEDmN9vHoW1VTK/2uNOnBwq0gQ4PJao//AOs1qp7S+ilyXwXvRGKGz1UiJEeP70p/jTSa7SeHRwLfG0Fw5NnHu9wpKC4U+qu723+VeV+wvS/WCxSrzo9Hex7KojSn5eMyF+7IQPtFgknn5AHbwITvURSZAvPY4zSOr2iwx7E8rlwriPxVAnyLJKK8pvZj0XzFsvae6j+zPKHus+0tS07/AKu6Vj5mq06IZFYsU1It8vL7OzcLKHSzPjvtcXAlXIrCfzkHnt6EVczLbVoyEJmTcUgN2WQ0h623SEpaW3dxzBWk7JUDzG/Ig8uYIGQCl1XnOOyVqfjpcegNRchiJ5hy3q3d29Wl7KP7PFUN3fEr/Z5bkeRDdRIaPvtcKkPI+LagFj6VaCfl9tsDxOAarZDZ0JO4jypjVwjj07tzbYfA703L32jJshwWXVHCMZzCIB+TmRfcUpP56d+LhPoOAj0plttUvfYoCsmZZlj7wNoye921aD0YmuN7fIGpbwztTakWxn2DI3oGV2xY4XY92jJVxp8RxpAP9IK+Fetwm9m7J0957bl2LrV1acaEpCT6EhatvmK4U7BdE1gqgaxvoHgH7K4T+7apZW6e87GdINcI7zmn0dOEZslBcVaHXAYkrYbnu9uQ+KdtvFHjUAS4+SYRlS2HfbrJe7c79pCy260odClQPQ9QRyINSJj1p0oxm+wryNUbjKehPJeaEG0uNLKkncDiVvsDW7r/AJrYNTrIjJLbCXEmWeYiDxupCXJMd1C1pKgN/srQrYbnkqrbRLqa+zh2iomeIa011bjQZz84CPFnSGUlqYo8g28kjhCz4KHInlyPMtftSdm8YXFfz3Tkvptcc97Ot/GVLhjf/ONq6lseIO5T13I6VYgCSZrAhBwyi4kMhv7fHv7u23jvtX1rZPe4m3HyHu1FduCLlx7cJJa2d39PtVja6ya4tILTYr5u4ff2r9Dct9xQhckI98Ee66nz28/OmfmliNluI7rcxXgVNE+Hmk/CvPH3UR8yYMFR7kyyhs+aCoj+FPXUxttWOBatuJD6eA/HcGujt5lWtaz2X7udfVA/0k5MyzVWs1PsdvI22PHS/wAQDxUX0UUV3y+VLpYxbJl4vsSBBtU27PLXxeyQ2lLddSnmoJCQT0B5+FPDJsF1byG9SLtccCylTzpASlNpeCWkAbIbSOHklKQEgeAAqdv5OXDPacgv2eSmt24LQt8NRHLvF7KcI9QkJH7dXcG/nUKL5A5Li+S40phORWC6WhUgEsibFWyXANt+HiA323HTzrkVOnbgzL8atdZ8Jh7jhWFpNuaAPLjT7zp+PGop/ZFQnbIUm5XKLbobRdkynkMsoHVS1EJSPqRURd2zaf51era1crRht/uEJ7fupEa3uuNr2JB2UlJB5gj5VsyNMNR47Dkh/AsmaZaQVuOLtbwShIG5JJTyAHjX1J07xyPh+C2TGIgHdWyE3H3H3lJT7yvmrc/Oo17aGYHEtBruhh7u5t5KbYxsdjs5v3hH/Vhf1FEXzgh2i5zWu9iQZD7e+3E22VDf5V6nHr4Dt+CZ3+4V/hUn4HbDBxqPxJKXH/yy/n0/dtW/kEoWyzSp6jsppslHqo8kj6kV0MmLvExjY0HWy+tUn4dUrsNbWVMzmHLmIsNNL9yg9xCm3FNrSUqSdlA9QaEJUtYQhJUpR2AA3JNbdsgTbtOEeIyt99w7nbw8yT4D1qUsUxKLZUJfc2kT9ubpHJHokf39fhXY1ddHSt9bU8F4zk7yWq8dmtEMsY2uOwdHE83XZRmLBfP9kTv9wr/CsHbJd2m1OOWyYhCRupSmVAAefSplus2Ja4apU58NtDp5qPkB4moryrKJl5cLLfExCB91oHmr1V5/DpWrRV09UdGAN4rveUnJbCMCjs+pc6Q7GgDrPAd+5cqytxHbvFRPWURC6kvkHY92Durb1232rdzLIZ2UZFJvE5WynCENND7DDSRwttJHglKQAB6VxzzNJXbr52iujjl6ueO3yHe7PKciTobodZdQdiCP4g9CPEHaufRRFIOt67dd71b83tEdEaLkcX2l9hHRmWk8EhI/aAV+3XExTUDNMVjmNj+S3GBHJ3LCHd2t/PgO6f3Vy13NbmMNWhwkhiYqQz+jxoCV/XgRXNq3RSG7rRqDIG0y6QZv/wATa4zm/wBW65s7UO5T0ETLDizxPVQsrCFfVABpnUUuVLLbuExMxzjTBiRT4hhKkg/Ik1qV7wIcufJTGgxX5T6zslplsrUr4Ac6lPEOzpqzkTaZKsbVZIRAKpd4dERCR58Kvf8Aomoqolrq45ab7kMxFisNvl3GTJcSoRozZWpRG4BIHQDiPM8hvVhrXo1obhW0jU7V2BdZLfNdtsq+Ib/mlSApZ+iK7UrtLab4HbHLPpFp6ltsjYyJQDCVnwUrYqcc/aUKoROTs4dnZnCZTOZ5+qM9d4472LDCwpmERz7xxXRSx4fdT13J224Pan7RMCXaJuDYHMEoyUlm43Ro/kw2eSmmj97foVdNtwN99xAmpmseoGoRUzfr24mAo7iBEHcxx8Ujmr9ommzarJ3iRKuTohxRz3WdlL+ArCSVsYuVs0lFNVyZIhfsA5ydgHSujp3bFSLmLi6nZmOfcJ+8vw+nX6V76kXhEl5u2MKCkMq4nSDy4/AfL++vC65OhqKIFlb7hpI4e822O3oP7zzpqqJJJJJJrQip3yz+cSi1tgXra/GKfD8K/KKF2bMbyP3E6aDm0GvAc5RRRUh9nDDTnes+O2FbfeRBJEmb5dw176wfjsE/tCuyXiV9BezBhn4i6JY9Z3mu7mvse2zQRz7573yD6pBSn9mnZqRk0fDcBvmUyiOC2wnHwk/fWB7ifmopHzpwbADYdKqz/KJ5l+DNP7RhcZ3Z+8yfaJCQefcM7EA/FZSf2DURUYuUyTcbjJuExwuyZTynnlnqpaiSo/Umpr7D+H/jVrtb5j7PHCsTSri6SOXGn3Wh8eNQP7JqDDV/P5PXDvwNpXOyuQzwyb/LIaURz9nZ3Sn6rLn0FEVmfGqQdvDIFZPq9jun8Zwqj2tkPSgDyDr2yjv8G0pP7Rq7M2THhQn5spwNsR21OurPRKUjcn6Cvmna7u9m2p+UZ5LCt5ktwscX3UqPup/ZQEiterm8jC567rk9hpxLEoaa2hOvQNT2BOlDaUoCUgJSBsB5Cm1nFqnXwxLRE/JscXfSXlD3UgckgeZ5nl6U5+IedebbqHEBba0qQobgg7g142KUxPzjaF+ksQoY6+nNLIbNdtA0uARcdB2HmWhYLJAssP2aC1sT9txX23D5k/3VoZZk9vsDJSsh+YRuhhJ5/FXkK6d9M42aV+C3Eomd2S0SN+fkPXyqBJLrz0hbkha1uqUStSzuon1rsqCkFY8ySuvbr/8AF4rlbyhdycp46Ohiylw0NvVA5hvPTxvqty+3edeZpkzXis/dSOSUDyA8Kfdh0E1gvdrYuduwW5rivpC2lultkqSehCVqB2PntXp2WcQRmmueOWqQyl6Ew/7bLSobpLbI49j6EhKf2qsD2vNfs5xHVZGJYJd24LUKI37WBGbdU4+57wHvpO2ySjkPEmvTNaGjK0WC+GzzyTyGWVxc47SdSVWvN9HdTMKspvOT4jOgW5KwhcgqQ4hBJ2HEUKPDueW5rDJ9ItSMZxUZTfcVmQbMQ2r2pa2yAHNuDcBRUN9x1HjV9dU27vdtMsIwC/vpm3vKZsGLdFhtKd0NASJS+EcgNminl+cKc2utph5fo/mmMRltOyWbcs90nmW3UIDzQI8N+FP1rJcS+b2L6WZ/k2KScqseNyJdki9530wOtoQju08Sz7ygdgPSuTg2H5LnF7NlxW0u3S4BlTxZbUlJCEkAq3UQPEfWrjamuDSjsK2nHEbMXK9RWoy09Fccgl5/6J4k/So7/k44Xfat3yaRyjWVSd/Vbzf+Boigedp/mMLPG8EkWKQnJHFoQiAFIUsqWkKSNwSn7J368h1r11B03zbADCGYWB+0mdx+zBxxCu84duLbhUenEPrV3tLsZgjXTUfWfIiG40e6KtFpWsb80cDK1p8yVBLY28SoVvaz4SNQ+0xgVtmNd7aLBbnrtOBG6VbvJS2g/rLbHLyCqIqYP6EatMKtyHsLmNruTndw0KeaCnVcCnNgOPcbJSonfbbbnXIumK5bg+Wx8avWMx277J7ssRZSG5Cj3iuFA4Qop5nwNX3wq/f5RO0rfrhFc72xYPCNsiqB3Q5OfV+WcHwS2Uf/AO0xU6IZ7fu1p/lKyaPARjzFx9oYAlhbndso4Y44NuXNKCfLnRFBq7Z2mLHd7di0OJcLFNuaHVQ4dsEWIXUtAFZ3Z4dgARzJ8a5t70T7Rt8cK71j2Q3JRO+8u5Id/tOGroYpvk3aWyq+K9+HitrYskU+HfvHv3yPUDu0mo01Wu/aox5WSZOxccdt+MwVvyWUKDDi24ySSgc07qVw7fEmiKqtp0N1Xu0+5wbdh0uRItcgRpqUvNfkXSgL4CSvYnhUk8t9t62rj2fNY7fAkT5uDzGIsZpTzzqpDGyEJBKlH3+gAJq62j8HOI/ZqdvVnLD+c5Il68d7JCUIMiQrdKlAjYBLfAdttuW1Q1qJcO0uiZY8Dzm92cQ8zlfgvu4TTBcU0opDp3SkFICVczRFXW66Z6hY5hsfNLljb0KySENLZmuLb94OAFBCeLi5gg9N642KY1lOcXxNrx21zr1cFJK+7ZSVFKR95RPJI9SQKtd/KKZCxb7LiOntvPdsISZrrSTyShCe6ZG3l/nPpTk7AGOrt2i1/wAmtqIzt4ukt1tjvDsB3KNm0KPUArUon0IqWF7rPyj8uS+nBVoPZw1sA3/EKby/5yx/36jK9Wu42W7SrTdoT8KfEcLT8d5HCttY6gir4WO6dqrDF3G+5XaLVmdvairUIUWYwwtsghRWnhb4lbJBHD47+dUp1Ry6TnmoF5y6XGRFducjve4SriDSQAlKd9hvsABvtVWCbVW1/k7IENmdluRuBJlstx4bJPVCFla1n5lCfpVSqkLQzVG46YZG9NZje226ahLc2Lx8JUAd0qSfBQ3PoQSPWsghX0zVekj7wquvaP0QnasZ0zkrOZxre01CRFTFkRVr7vhKiSkpPQlRPMda5cLtLaczGEuPzLnAcI5tvQlKKfmgkVkvtC6aK6ZDK/8Ap73/AHays1YXKZMLshviW17dqDB9mCh3vcQFlwp8eHiUBv8AGra4ou1YvjVtx2zILVvt0dEeOlSt1cKRtuT4k9SfMmq9q7QOm23/AKQyz8Le9v8Awps5X2nMehxloxm1XC6yyNkOTAGGEnzIBK1fD3fjSzQmpUtdsDU9jGtIJ1mYkgXbIUGHHbCveDJ/zznw4fd+KvQ1VLEWE2zHoscgBxSe9c/WVz/cNhTKv+TXfOc0TecquQeddWApSyENtNjmEIT0SkdAB5+Zp0ru1vUon8IwxuenfDlXR4xmkAjaNNq+l/h4YaSSWskcAfZFyN+pPd2rpZDdRBskuSk7KS2Uo/WVyH8d/lXA03vRdhrtby91sDia38UeI+R/jXJzm6MvxI8ONIbeBUXHC2rccuSR/Gm3aprtvnszGvtNq328x4j5iuKmw4PpC0jU69Wz751v4zyzfBygimjdeOMZTbYQ7V3Vp8WqaBJHnUbah2tMW5/hCOkBiUSVAdEueP16/WnMm8W5xCXEXCMkKAICnQCN/AjzrwuMm1T4LsN64w+Fwcld8PcUOh+v99adC2SllzWNt69HynkpMcoDDnbmGrTcbfA7O3cpl/k+YkCPccpv63UruDbTMRpoH3kNKJUtXwJQkfKu27oBfbvrarPsjyK2y4jt4/CD0ZtpzvFIC+JLfMbdAlPXoKqrj0VaVuSI+RM2p9tRQSHlIUR5gp6iuw4Lo4hTa9QgtChspKpzhB/fXo3VUTDld3HwXxqHBK2dgkjAsf4mjsLrq9VryKPlmuMq7xpKJUDE7aYKHUHdImyVcT2xHIlDbaUny4iKj/s0apu5NrLqahThdYuT6JkNPX8kye4H9Qt1U2Fb3oTamoWaxoyFndSWpK0BR6bkA15wbV7A8X4OYQorpBSVsvqQrby3HhWPnkXHsPguT0dr/dHzs/Upx7feYKu2XWHFW1kNWuIqQ8gctnXTsAR6IQk/tV0/5Pnjhv5jdA2tXuRY4KRvtuXFH+AqvMyzNzJCpEvLYEh5W3E468pajtyG5POvaBAet6VpgZtGiJWQVhiStAVt032POnnkV9vYfBX0er7eyPnZ+pWx1jzxuRq1gOlVlAaitXuPc7qhrqVh3vUoV5nficPqUmn7r3qYzgGA3fI4wDd8uDSYMFZHvFz3uE/BAUtfx+NUONrJne3nMoZl8XF3/fq7zfz4uu9ZTre7PSlE7NIspKCSkPSVrCfhuavnkX2D4Kejtf7o+dn6lajSC5SNK+yNdcoKlM3e5tPXFLy/tKddIaYO56/dV8zXR7H+Y5jcsKyHMs3ya6XSIhzu43tbpUhttlBW6sf0gP2aqO/BffhphPZtGdipACWVyllAA6AJJ25UMwpDEMwmM3jtRVAgsolLS2Qevug7c6nnkX2D4J6PV/uj52fqV5NJG8gd0SuE+DIFuyLLly7uJa0k9y7JJLSjtz91vu9vhUP6jaf6xptEC0ZLq1LvMK93ONbDA4nfyxcWCftctkhJUf1agFpNzaaS01qAlDaEhKUpnOAJA6ADfkKxdZuDy2lu5604ppXG2pU1wlCtttxz5H1q+eRc/UfBPR+v90fOz9Svtq9ZM5vWOWiy6eZX+KbcBezjqQsLW2lAQ22CkdBzJ+VRfpZh+axe0REk53mL2Wu47Z1zGVrUsiK5IUWkJ97oSErVy8hVXSq7/wDvC3/+fd/xrXCbk2+4+jN0h1wAOOJmuBSwOm5357VfO4j/AOHwWBwGubtaPmb+pWa7Tejd/wA4y+9Z/Nym2QrbDgAtMuMuFTTLLZJBI5blXEf2q3LJolcLNp/b5Ol2o1/s91nNsSJK1XBSYToLe61JQ2jfffbYknlVVJTl0dZWy9mReaWOFaFTXFJUPIgnnWoifd7fGDETJ5DbKPstsSnAkfAA7Vm2eNx0WtJhtTELvA62+KvLcsnyHSfQC8uZvmRvuRuofRDfdcJKnXE8DbaOIBRCftHly518/vU1sT586e6HJ02TLWnkFPOqWQPma165VohFZMtuPOJbaQpa1HZKUjck1jWTTi2lhba1IUOhSdiKEHcsm5bjNsXa/FLIdgfwav8App/xo/FHIf8AZq/6af8AGuX7dN/1yR/vTR7dN/1yR/vT/jWrlqfeb1HxXdiXBf3cvzt/xrqfilkP+zV/00/41pXSz3C2BBnMBnj+yCtJJ+QNe9j9ouVwRDcu70UuckLUpRBV4Dr411cjw+6QoSp5kKmhsbu+6eJCfzuZO48/Ks42T3u8i3MD4rXqpcLMZEDHh38TmkdQYO9a8LE1u4n+MU68222svKeRBZklzvJimgkuBHAhQTtxJAKikEnYeNE3DbtFwCFmjio5gS5JYS0FEuoHvBLihtsEKU24kHfq2r038Lbld6gY+7YWXozkBxTikofiNPKZUtISstKWkqbKkgAlJG+w8q2Jed5XLxv8W5N4ecswjtR0wSB3KEtqCklKdtkq33JUOZ4lbk7muay6tb2o2nN3wiJDlXGXFfblOKaHdIdQUrShCzt3iE8adnE++jiTvuN+VYWbAZ11xdm8xrrbUvyUS3I1vWXA++iMgLeKTw8G4SSQCoE7HauXk+WZBkzbTd7nqmBl1brRWhILZWEhQBA5JPAk8PTfc7bk7+9tzbI7djZsEKWwzD4XkJUIrReQl4AOpS6U8aUrAAIBG45eJqIt26YBcrfiNjyN6Ywpm9FHs7aWHvdClrQOJzg7vfds+6FE7bcq0V4hcU3/ACKyl+L39gbkuSVcR4VhhfArg5c9z032rymZZeZdlt1okKiLYtoSmK57G0Hm0pUpQT3oTxlPEtR2J25163XNb/cbtPur7sRuXcYzkaYuPCaZDyHFcSyoISAVE9VdfWiLauOCXODYhe3ZcIwXGoa2HApX5cyQshCeX2kd24F79Cg9eVdmdpJeYmeow5dxjKmmM/IW4IkoJSllK1K4Ulrjc3CDsUJUD4U0pWT32Tjlsx1+etdstbzj8NgpTs2tZBUd9tzzHIEnbc7bbmt64Z5kk2/OX1UmNHuTrDzDr8WG0wpaXgoOFXAkbqIUfe68+Roi66NLbyb7e7Oq5WpD9jKXJ6luqSGo5QVl8gp34U+6lSduMKWkcO9NjEbDKybJIlkhPMMOSVHd98lLTKEgqW4sgEhKUgqJ26CvSVlN7k3O7XN6WlUu8MqZnuBpI75KlJUrcAbAlSEkkcyd/M1r45f7xjkx2bY570CU6wpgvsnhcShW3EEq6pJ223Gx2JHiaIu7GwOal28C83W22Nm1Tfwe69MLhSuSePZCQ2hR6IUeIgADbnzFeqdObwrTtGbNyYq4SgVBrgdCikP9xyWUd2Vcf3OLi4ee2wNaadQcr9vnTnri3Kfn90qUZUVp8OLbTwodKVpI7wDf39uLmefM1oqyu/nHvxeVcFqtfAECOUJKRs6p0EctwoKUo8XXZRHQ7URd+56aXKHKZiovdlkPC6NWmeEPKSmBKc34UuqWkDh91YK0lSQUK59N9mNpTeJGYXTG0XKIl+3RRKWpcaSlTiSUgBDXdd6o+9uSEEAAnfauHdc7yi6ey+3XBp32eQmV/wAFaHfPJGwcd2T+WXty3XxHYnzO/o1qDlLV9RekSoftjTLbDG9vYLcdDZ4kBpBRwtlKuYKQDvv50RamEY0coyNNjTdYdteWhakOSUOFCigFRT7iVEHYE8x4V1rZptfrpj7mQW1TUq0tpnKVLQ25wJTFQFqKt0+7xhQ4QdiT12ps2y8XK23kXiHKU3OBWrviAo7rBCjz5cwo/WtmFk18hW5m3xpym4zLclttAQk7JkICHh0+8lIHpty2oi6WaYRPxaz2a5TZbLou0ZuS0htl4cKFtpcHvqQEKOywCEk7GlOCXUW32/2mH3fsMWdtxK34JD3dIHTqFcz6edc2/wCS3a+w4MW5rjOpgsoZZWmI025wIQEJSpaUhSwEpAHET0rZXmmSLx+PYTcB7DH7sISGGw4UoWVoQpzh41ISpRISSQCelEWWoWG3PB76bHenY/4RQCp5hsqJaHEQgq3AHvJAWB14VDfY8q0YOOXqbGTJjW9xbS/sqJCd/huaeF6s+U5OxHnZLdQZKA4sB1gcbaXFlwhShty4lKPCfs8Ww26UxpMqQy+tli4vutIPClYWpIUB4gb9KxlbJb1LDpW1RupA8+chxH8JAPWQe5dD8Ush/wBmr/pp/wAaDiWQgEm3LGw3+2n/ABrl+3zv9ckf7w0ipsxSSlUp9QPIguHY1wZan3m9R8V2RlwXdFL87f8AGvJ5tTTqm17cSTsdiCPqKxoorbAXRki+iKKWk2qrFFFFFFUAkEEHYjpU0aU5M1e2022a4lN1aT7hUBtIQB5eJ26jxHzqF69Ir78WS3JjOrZeaUFIWg7FJHQg1QbFQi6k7VTTZy3R3skx5grtyfemxUc1QyfvAdS0T4/d6HwJjEsq7rvUe8gfaI+6fWrEaP6isX9bVunutxb2E8AJA7uWnbYgA8tyOqDyPh5DV1I0dXJcdv2nsfgkgFcqyjnxfnGPv9oebR5j7u45A9ptdqyjLb2fsVfaK7SYMS4OKZbIt89JKVR3dwlSh1A35pPoa50+BMgu93KjraV4bjkfgehrgbK1xynQ8FuzUEscflQMzPeGo6DwPMbFa1JS0VyWWkkopaKWRJRS0VESUUtFWyJKNqWiiIoroWuzz7juphkhofadX7qE/M11LTaVy7qxZschPX28Pq4Ww00VJB/RT47fnHkOtcRmbmyt1P3tW+zD5fJCaX1Gbid/8o2n4aDeQm+thaEJKxwlX2U+J9dqmfTXTN21MM37I43/AIxWA5CgLHNgHmHXR+d+ag9Op8BT2010riYitN5vbke7ZL9scwuPAPmCeTjg/O+ynw3PMMXV7U1pSpFlxmUXlLJEu4BW/ET1S2fH1X9POthrbC7loSOaTZmxcHVXKGi67Y7Y7xnciW+k77nxQD4+p+XnUbUUUJusRoiiijaoqijwpaKKIpaPCgURJtRWVJtWSJKKWkoiVC1IWlaFFKkndJB2II8RU3aY6zlsMWrMnFqQnZLVzQklafLvQOav1hz8wetQhSig02IRdXCzLBsO1JgouE0oYnvI3j323cKy55d6kHheHruFjzPSoYzDCc5wGOpV3tzOR44DsmfG3eZA8OI7cTR9FgelMjCc2yPD5JdstwUhlSt3YrnvsufFB8fUbH1qfdP9ebHMcS3dFu49OUOBTgUVxnPMFXUA+SgR61hLDHMLPC26LEKmgk8pA8g9h5iDoRzFQam24te+dumqtsk/6F77O/pv/ca0bjht6iklthMpv85lW/7jzq0eRad6aZtH9vdtLMN50bpuVgcQ2HCfFTfNpXyCT60w7joXl9sJXheZwLoyOaYs1RiPbeWy92z8l1pOpqmL9m+44HXtGq75mK4TW/8ANp8jveiNuthu3qsq9yIsiOvgfZcaV5LSR/GvLhNTHerNqjYWyMi0+uDzA6vNRlOtEfro4kU1nb9jhcKLjjamHPEd2kH+41h5zUN9qLqIPguYYNg8+sFcBzPY5vaMwTF4TRwmnwLjgq+arc+n4A/96l/CmDN802t1Z8in/FVPPn/undQ8VfRmn2muht/M79KY3Ca2oVtnTFBMWI88f0EEj60+Lfd4Ul0NWDDnpjpOyQ1H41fRIJp4W7CNZr4hJi4iqxxldHrgUxUgef5Ugn5Jp5epf7Mduk+F1DheCU+s9Zm5mMJ7XZQo2hYVclo76c4xBZH2i4sEj5Dl++tj/wAlbQtKI7bl6mk7JH+j4vh4/vqZ7N2fxIcS/nOcuSyOZiWhsr+XeugJHyQqn3Da030sje0QIlqsDqU/8MlOd/OcH6KlbqB/6NKa5G0k0msz9OA0HXtXA/GsPpNMPpxm9+T1z8G2DB1FRFjGkOb5ehmblz4xOxEBaI62v5y6nw4GNwef5zhSPLepWQjBdK8ZcTCQzZIbieF2S6rvJs4jwKgN1fqJAQPHzqNM97QPGt1nE4S3HFE7z543J9Ut78/io/KoOv15ul9uK7jeJ8ibKX1ceXudvIeAHoOVbkcccQysC8/V1lRWSGWd5c47yn3qnqxcsqDlstSHLZZjyUji/LSB/wAoR0H6A5ee9RoaKKzOq10UgpaBURAFLtQKCaqIpKWkNREu1Ao3o9aIjelpKWqlkEUhFKDRRRY0b1kRWO1FUUoNYkUDrURdWw3+9WKR39nukuCvx7l0pCviOh+dSTj+vOVQkpbukWDdEDqpSO6cPzTy/q1EVG5qg2Sys3YO0PY0KCpEG72x3xVHcCx9QUn91OtvXLDLkgCZkKXd/uT4Bd/toUKpzvS8Rq5lLK451C0vke+45hSz5uWePv8AvbpBqbprB5x5eJsEeMezs7/1Wqp1xHzpCo+dLjgllby4doPF4rZbYv10eT/xcOOptJ/simVfe0TGPF+CcdffWf8ASzJAT89k7/xqu+5o33pnTKFI2RazZ1dgttm4otbKuXBCb4Dt+ud1fQio/lypEuQp+U+6+8s7qccWVKUfUnnXiTSViTdWyXejekpdqIiilApRVRG1FBpN6KJaSiiiqSilo3qIkFZVjSg0RBFApeVFVEUA0UlFEtBoBo3oiTakIrKjaiXWO1G1ZEUbVLK3WG1FZ7Um1LJdY0VlsKNqWS6x2o2rLal2pZLrHajastqKWS6QCl2oo3qqIooooiSil2oordIBRtS0URJvSGlpDURf/9k=";
const LOGO_WORDMARK = "data:image/jpeg;base64,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";
document.addEventListener("DOMContentLoaded",()=>{
 const li=document.getElementById("loginLogoImg"); if(li)li.src=LOGO_WORDMARK;
});

const KEY="ukow_connected_v1";
let role="admin", currentUser=null, currentStaffUser=null, page="desktop";
let STORE_CACHE=null, storeReady=false, currentSession=null;

// One shared row (id='main') in the app_store table holds the whole app's data as JSON,
// mirroring the old localStorage blob so every existing getStore()/saveStore() call
// below keeps working unchanged — it now reads/writes a synced in-memory cache instead
// of localStorage, and pushes changes to Supabase (+ pulls other clients' changes live).
async function initStoreFromSupabase(){
 if(!SUPABASE_CONFIGURED){STORE_CACHE=JSON.parse(localStorage.getItem(KEY)||"null")||defaults();storeReady=true;return;}
 try{
   let {data,error}=await sb.from("app_store").select("data").eq("id","main").maybeSingle();
   if(error) throw error;
   if(!data){
     const seed=defaults();
     const ins=await sb.from("app_store").insert({id:"main",data:seed});
     if(ins.error) throw ins.error;
     STORE_CACHE=seed;
   }else{
     STORE_CACHE=data.data;
   }
   storeReady=true;
   sb.channel("app_store_changes")
     .on("postgres_changes",{event:"UPDATE",schema:"public",table:"app_store",filter:"id=eq.main"},payload=>{
       STORE_CACHE=payload.new.data;
       if(document.getElementById("app") && !document.getElementById("app").classList.contains("hidden"))draw();
     }).subscribe();
 }catch(e){
   console.error("Supabase store load failed, falling back to local-only mode:",e);
   STORE_CACHE=JSON.parse(localStorage.getItem(KEY)||"null")||defaults();
   storeReady=true;
 }
}
initStoreFromSupabase();
document.addEventListener("DOMContentLoaded",()=>{
 const hint=document.getElementById("loginHint");
 if(hint && !SUPABASE_CONFIGURED){
   hint.innerHTML="<b style='color:#b31d2c'>Supabase is not configured yet.</b> Edit SUPABASE_URL and SUPABASE_ANON_KEY near the top of the &lt;script&gt; tag, then reload. Running in local-only demo mode for now — data will not sync across devices.<br><br>"+hint.innerHTML;
 }
});
function defaults(){
 return {
  businesses:[
   {name:"Prestige Motors Ltd",contact:"John Smith",phone:"07700 900123"},
   {name:"London Auto Group",contact:"Sarah Jones",phone:"07700 900124"}
  ],
  drivers:[
   {name:"James Wilson",email:"driver@ukonwheels.co.uk",phone:"07123 456789"},
   {name:"Mohammed Ali",email:"mohammed@ukonwheels.co.uk",phone:"07234 567890"}
  ],
  bookings:[
   {ref:"BK00130",business:"Prestige Motors Ltd",vehicle:"BMW 320d",reg:"XY21 ABC",pickup:"Glasgow",destination:"Edinburgh",service:"Vehicle Delivery",miles:48,bookingDate:"2026-08-18",deliveryDate:"2026-08-18",receiver:"John Smith",receiverMobile:"07700 900123",dropoffTill:"17:00",status:"Delivered",amount:180,driver:"James Wilson",paymentStatus:"Pending",timeline:[{title:"Delivered",text:"Vehicle delivered for invoice testing."}]},
   {ref:"BK00129",business:"Prestige Motors Ltd",vehicle:"Ford Transit Custom",reg:"AB12 CDE",pickup:"Manchester",destination:"Birmingham",service:"Vehicle Delivery",miles:85,bookingDate:"2026-08-19",deliveryDate:"2026-08-19",receiver:"John Smith",receiverMobile:"07700 900123",dropoffTill:"18:00",status:"New Booked Vehicle",amount:145,driver:"",timeline:[{title:"Booking Created",text:"Booking created in Admin portal."}]}
  ],
  notifications:[{title:"Portal Connected",text:"Admin, Client and Driver views now use one shared prototype data store."}]
 }
}
function getStore(){return STORE_CACHE||defaults()}
function saveStore(s){
 STORE_CACHE=s;
 window.dispatchEvent(new Event("ukowupdate"));
 if(!SUPABASE_CONFIGURED){localStorage.setItem(KEY,JSON.stringify(s));return}
 sb.from("app_store").update({data:s,updated_at:new Date().toISOString()}).eq("id","main")
   .then(({error})=>{if(error)console.error("Supabase save failed (change is still visible locally):",error)});
}
function currency(v){return "£"+Number(v||0).toFixed(2)}

function migrateClientData(){
 let s=getStore(),changed=false;
 s.businesses=s.businesses||[];
 s.bookings=s.bookings||[];
 s.invoices=s.invoices||[];
 s.notifications=s.notifications||[];

 // Repair older/fresh saved stores that contain no bookings.
 if(s.bookings.length===0){
   s.bookings.push(
    {ref:"BK00130",customerType:"Business",business:"Prestige Motors Ltd",vehicle:"BMW 320d",reg:"XY21 ABC",pickup:"Glasgow",destination:"Edinburgh",service:"Vehicle Delivery",miles:48,bookingDate:"2026-08-18",deliveryDate:"2026-08-18",receiver:"John Smith",receiverMobile:"07700 900123",dropoffTill:"17:00",status:"Delivered",amount:180,driver:"James Wilson",paymentStatus:"Pending",timeline:[{title:"Booking Created",text:"Booking created."},{title:"Driver Assigned",text:"James Wilson assigned."},{title:"Picked Up",text:"Vehicle picked up."},{title:"On Route",text:"Vehicle on route."},{title:"Delivered",text:"Vehicle delivered."}]},
    {ref:"BK00129",customerType:"Business",business:"Prestige Motors Ltd",vehicle:"Ford Transit Custom",reg:"AB12 CDE",pickup:"Manchester",destination:"Birmingham",service:"Vehicle Delivery",miles:85,bookingDate:"2026-08-19",deliveryDate:"2026-08-19",receiver:"John Smith",receiverMobile:"07700 900123",dropoffTill:"18:00",status:"New Booked Vehicle",amount:145,driver:"",paymentStatus:"Pending",timeline:[{title:"Booking Created",text:"Booking created in Admin portal."}]}
   );
   changed=true;
 }

 s.bookings.forEach(b=>{
   if(!b.customerType){b.customerType="Business";changed=true}
   if(b.business==="Prestige Motors Ltd" && !b.receiver){b.receiver="Customer";changed=true}
 });
 let prestige=s.businesses.find(b=>b.name==="Prestige Motors Ltd");
 if(!prestige){
   s.businesses.push({
    name:"Prestige Motors Ltd",
    type:"Motor Trade",
    address:"Client business address",
    postcode:"",
    email:"client@ukonwheels.co.uk",
    phone:"",
    invoiceCycle:"Monthly",
    tariffType:"Custom Tariff"
   });
   changed=true;
 }else{
   if(!prestige.email){prestige.email="client@ukonwheels.co.uk";changed=true}
 }
 if(changed)saveStore(s);
 return s;
}

async function loginNow(){
 const emailEl=document.getElementById("email");
 const passwordEl=document.getElementById("password");
 const loginEl=document.getElementById("login");
 const appEl=document.getElementById("app");
 const emailValue=(emailEl?.value||"").trim().toLowerCase();
 const passwordValue=passwordEl?.value||"";
 const signInBtn=document.getElementById("signInBtn");

 if(!emailValue)return alert("Please enter your email address.");
 if(!passwordValue)return alert("Please enter your password.");
 currentStaffUser=null;

 if(SUPABASE_CONFIGURED){
   if(!storeReady)return alert("Still connecting to the database — please try again in a moment.");
   if(signInBtn){signInBtn.disabled=true;signInBtn.textContent="Signing in…";}
   try{
     const {data:authData,error:authError}=await sb.auth.signInWithPassword({email:emailValue,password:passwordValue});
     if(authError){alert("Sign in failed: "+authError.message);return}
     currentSession=authData.session;
     const {data:profile,error:profileError}=await sb.from("profiles").select("*").eq("id",authData.user.id).maybeSingle();
     if(profileError||!profile){
       alert("Signed in, but no profile record was found for this account. Ask an admin to set one up in the 'profiles' table.");
       await sb.auth.signOut();
       return;
     }
     if(profile.status && profile.status!=="Active"){
       alert("This account is "+profile.status+". Contact your administrator.");
       await sb.auth.signOut();
       return;
     }
     role=profile.role;
     if(role==="staff"){
       currentStaffUser={name:profile.name,role:profile.staff_role||"Staff",permissions:profile.permissions||[],status:profile.status||"Active",email:profile.email};
       currentUser={name:profile.name};
     }else if(role==="client"){
       currentUser={name:profile.business_name||profile.name,userName:profile.client_user_name||profile.name,email:profile.email,clientUserId:profile.id,clientAccess:profile.client_access||"Full Access"};
       migrateClientData();
     }else if(role==="driver"){
       currentUser={name:profile.driver_name||profile.name};
     }else{
       currentUser={name:profile.name||"System Admin"};
     }
   }catch(e){
     alert("Could not reach Supabase. Check your internet connection and SUPABASE_URL/ANON_KEY.");
     return;
   }finally{
     if(signInBtn){signInBtn.disabled=false;signInBtn.textContent="Sign In";}
   }
   if(!loginEl||!appEl)return alert("Portal could not initialise. Please reopen index.html.");
   loginEl.classList.add("hidden");
   appEl.classList.remove("hidden");
   if(role!=="driver")document.body.classList.remove("driver-mode");
   page=role==="driver"?"driver":"desktop";
   render();
   return;
 }

 // ---- Local-only fallback (used only when Supabase config above is left blank) ----
 if(role==="admin"){
   if(emailValue!=="admin@ukonwheels.co.uk")return alert("Admin email: admin@ukonwheels.co.uk");
   if(passwordValue!=="ChangeMe123!")return alert("Demo password is ChangeMe123!");
   currentUser={name:"System Admin"};
 }else if(role==="client"){
   migrateClientData();
   const s=ensureClientUsersData();

   // Main business client account
   if(emailValue==="client@ukonwheels.co.uk"){
     if(passwordValue!=="ChangeMe123!")return alert("Demo password is ChangeMe123!");
     currentUser={name:"Prestige Motors Ltd",userName:"Main Client User",email:emailValue};
   }else{
     // Additional users created inside Client Portal
     const found=(s.clientUsers||[]).find(u=>String(u.email||"").toLowerCase()===emailValue);
     if(!found)return alert("Client user not found.");
     if(found.status==="Disabled")return alert("This client user account is disabled. Please ask your business administrator to activate it.");
     if(found.password!==passwordValue)return alert("Incorrect password.");
     found.lastLoginAt=new Date().toLocaleString();
     saveStore(s);
     currentUser={
       name:found.business,
       userName:found.name,
       email:found.email,
       clientUserId:found.id,
       clientAccess:found.access
     };
   }
 }else if(role==="driver"){
   if(emailValue!=="driver@ukonwheels.co.uk")return alert("Driver email: driver@ukonwheels.co.uk");
   if(passwordValue!=="ChangeMe123!")return alert("Demo password is ChangeMe123!");
   currentUser={name:"James Wilson"};
 }else if(role==="staff"){
   if(passwordValue!=="ChangeMe123!")return alert("Demo password is ChangeMe123!");
   const s=ensureStaffUsers();
   const found=(s.staffUsers||[]).find(u=>(u.email||"").toLowerCase()===emailValue);
   if(!found)return alert("Staff user not found. Create the user first from Admin.");
   if(found.status!=="Active")return alert("This staff account is inactive.");
   currentStaffUser=found;
   currentUser={name:found.name};
 }else{
   return alert("Please select Admin, Client, Driver or Staff.");
 }

 if(!loginEl||!appEl)return alert("Portal could not initialise. Please reopen index.html.");
 loginEl.classList.add("hidden");
 appEl.classList.remove("hidden");
 if(role!=="driver")document.body.classList.remove("driver-mode");
 page=role==="driver"?"driver":"desktop";
 render();
}function nav(){
 if(role==="admin")return [
 ["desktop","1. Desktop"],["booking","2. Create Booking"],["users","3. Users"],["createUsers","   • Create Users"],["assignRoles","   • Assign User Roles"],
 ["businesses","   • Businesses"],["assign","   • Assign Driver"],["status","4. Status Update"],["singleUpdate","   • Single Booking Update"],["approvals","   • Update Approvals"],
 ["miles","5. Update Miles"],["amount","6. Update Amount"],["destination","7. Update Destination"],
 ["accounts","8. Accounts"],["expenses","   • Add Expenses"],["invoices","   • Generate Invoices"],["payments","   • Cash / Bank Transactions"],["pendingPayments","   • Pending Payments"],["accountReports","   • Reports"],["pnl","   • Profit & Loss"],["hr","9. HR"],["hrRegister","   • Employee Registration"],["hrHolidays","   • Holidays"],["hrPayslips","   • Payslips"],["hrNonResidents","   • Non-Resident Records"],["hrShareCodes","   • Share Codes"],["hrDvla","   • DVLA Records"],
 ["messageCentre","📱 WhatsApp / Text Messages"],["settings","10. Settings"],["settings","   • WhatsApp Messaging"],["settings","   • Text Messaging"],["settings","   • Messaging API Settings"],["notifications","   • Notifications"],["logout","11. Logout"]
 ];
 if(role==="client"){
 const invoiceAccess=typeof clientInvoiceAccessEnabled==="function"?clientInvoiceAccessEnabled():true;
 const items=[
  ["desktop","Dashboard"],
  ["booking","Create Booking"],
  ["clientBookings","Bookings"],
  ["clientTracking","Tracking"],
  ["clientReports","Reports"],
  ["clientPayments","Payments"],
  ["clientBusiness","Business Profile"],
  ["clientUsers","Users / Access"],
  ["clientSettings","Settings"]
 ];
 if(invoiceAccess)items.splice(4,0,["clientInvoices","Invoices"]);
 items.push(["logout","Logout"]);
 return items;
}
 if(role==="driver")return [["driver","My Jobs"],["logout","Logout"]];
 const base=[
  ["desktop","Desktop","desktop"],["booking","Create Booking","booking"],["businesses","Businesses / Clients","businesses"],
  ["assign","Assign Driver","assign"],["status","Status Update","status"],["singleUpdate","Single Booking Update","status"],["approvals","Update Approvals","status"],["miles","Update Miles","miles"],
  ["amount","Update Amount","amount"],["destination","Update Destination","destination"],["accounts","Accounts","accounts"],
  ["reports","Reports & Invoices","reports"],["hr","HR","hr"],["hrRegister","Employee Registration","hr"],["hrHolidays","Holidays","hr"],["hrPayslips","Payslips","hr"],["hrNonResidents","Non-Resident Records","hr"],["hrShareCodes","Share Codes","hr"],["hrDvla","DVLA Records","hr"],["messageCentre","WhatsApp / Text Messages","notifications"],["notifications","Notifications / Messaging","notifications"],
  ["settings","Settings","settings"],["users","Users","users"],["driver","Driver Mobile App","driver"]
 ];
 const allowed=(currentStaffUser?.permissions||[]);
 return base.filter(x=>allowed.includes(x[2])).map(([p,n])=>[p,n]).concat([["logout","Logout"]]);
}
function hasPermission(key){
 if(role==="admin")return true;
 if(role==="client"){
   return ["desktop","booking","clientBookings","clientTracking","clientInvoices","clientReports","clientPayments","clientBusiness","clientUsers","clientSettings","clientStatusPage","reports"].includes(key);
 }
 if(role==="driver")return key==="driver";
 return (currentStaffUser?.permissions||[]).includes(key);
}
function render(){
 if(typeof checkDocumentExpiries==="function")checkDocumentExpiries();
 const title=role==="driver"?"Driver Mobile App":role==="client"?"Client Portal":role==="staff"?(currentStaffUser?.role||"Staff Portal"):"Admin Portal";
 app.innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand"><img src="${LOGO_ICON}" alt=""><div>UK <span>ON</span> WHEELS<small>${title}</small></div></div><div class="nav">${nav().map(([p,n])=>`<button class="${page===p?'active':''}" onclick="go('${p}')">${n}</button>`).join("")}</div></aside><main class="main"><div class="top"><h2>${title}</h2><div>${role==="client"&&currentUser.userName?`${currentUser.userName} · ${currentUser.name}`:currentUser.name}${role==="staff"?` · <span class="badge">${currentStaffUser?.role||"Staff"}</span>`:""}</div></div><div class="content" id="content"></div></main></div>`;
 draw();
}
function go(p){
 if(p==="logout"){if(SUPABASE_CONFIGURED && sb)sb.auth.signOut().finally(()=>location.reload());else location.reload();return}
 if(role==="client"){
   const allowed=["desktop","booking","clientBookings","clientTracking","clientInvoices","clientReports","clientPayments","clientBusiness","clientUsers","clientSettings","clientStatusPage","reports"];
   if(!allowed.includes(p)){alert("This section is not available in the Client Portal.");return}
   page=p;render();return;
 }
 const permissionMap={desktop:"desktop",booking:"booking",businesses:"businesses",assign:"assign",status:"status",statusPage:"status",singleUpdate:"status",approvals:"status",miles:"miles",amount:"amount",destination:"destination",accounts:"accounts",expenses:"accounts",invoices:"reports",payments:"accounts",pendingPayments:"accounts",accountReports:"reports",pnl:"accounts",reports:"reports",hr:"hr",hrRegister:"hr",hrHolidays:"hr",hrPayslips:"hr",hrNonResidents:"hr",hrShareCodes:"hr",hrDvla:"hr",messageCentre:"notifications",notifications:"notifications",settings:"settings",users:"users",createUsers:"users",assignRoles:"users",driver:"driver"};
 const required=permissionMap[p];
 if(required && !hasPermission(required)){alert("Access denied. This section is restricted for your user role.");return}
 page=p;render();
}
function visibleBookings(){
 const s=getStore();
 if(role==="client"){
   const businessName=currentUser?.name||"Prestige Motors Ltd";
   return (s.bookings||[]).filter(b=>(b.customerType||"Business")!=="Private" && b.business===businessName);
 }
 if(role==="driver")return (s.bookings||[]).filter(b=>b.customerType!=="Private" && b.driver==="James Wilson");
 if(role==="staff" && currentStaffUser?.role==="Driver")return (s.bookings||[]).filter(b=>b.customerType!=="Private" && b.driver===currentStaffUser.name);
 return s.bookings||[];
}
function statusTabs(){
 return role==="client"?["New Booked Vehicle","Driver Assigned","Picked Up","On Route","Delayed","Delivered","Claims","Accident","Assigned AA on Route"]:
 ["New Booked Vehicle","Driver Assigned","Picked Up","On Route","Delayed","Accident","Claims","Delivered","Fault On Route","Assigned AA on Route"];
}
function draw(){
 const c=document.getElementById("content");
 if(role!=="client"){
   const permissionMap={desktop:"desktop",booking:"booking",businesses:"businesses",assign:"assign",status:"status",statusPage:"status",singleUpdate:"status",approvals:"status",miles:"miles",amount:"amount",destination:"destination",accounts:"accounts",expenses:"accounts",invoices:"reports",payments:"accounts",pendingPayments:"accounts",accountReports:"reports",pnl:"accounts",reports:"reports",hr:"hr",hrRegister:"hr",hrHolidays:"hr",hrPayslips:"hr",hrNonResidents:"hr",hrShareCodes:"hr",hrDvla:"hr",messageCentre:"notifications",notifications:"notifications",settings:"settings",users:"users",createUsers:"users",assignRoles:"users",driver:"driver"};
   if(permissionMap[page] && !hasPermission(permissionMap[page])){
     c.innerHTML=`<div class="panel"><h2>Access Restricted</h2><p class="muted">Your user role does not have permission to open this section.</p></div>`;
     return;
   }
 }

 if(page==="desktop"){
   if(role==="client")return drawClientDashboard(c);
   if(role==="admin"||role==="staff")return drawAdminDashboard(c);
   return drawDesktop(c);
 }
 if(page==="clientStatusPage")return drawClientStatusPage(c);
 if(page==="booking")return drawBooking(c);
 if(page==="businesses")return drawBusinesses(c);
 if(page==="assign")return drawAssign(c);
 if(page==="status")return drawStatus(c);
 if(page==="statusPage")return drawStatusPage(c);
 if(page==="singleUpdate")return drawSingleBookingUpdate(c);
 if(page==="approvals")return drawUpdateApprovals(c);
 if(page==="notifications")return drawNotifications(c);
 if(page==="messageCentre")return drawMessageCentre(c);
 if(page==="reports")return drawReports(c);
 if(page==="clientBookings")return drawClientBookings(c);
 if(page==="clientTracking")return drawClientTracking(c);
 if(page==="clientInvoices"){ if(!clientInvoiceAccessEnabled()){c.innerHTML=`<div class="panel"><h2>Invoice Access Off</h2><p class="muted">Invoice access is disabled for this business account.</p></div>`;return;} return drawClientInvoices(c); }
 if(page==="clientReports")return drawClientReports(c);
 if(page==="clientPayments")return drawClientPayments(c);
 if(page==="clientBusiness")return drawClientBusinessProfile(c);
 if(page==="clientUsers")return drawClientUsers(c);
 if(page==="clientNotifications")return drawClientNotifications(c);
 if(page==="clientSettings")return drawClientSettings(c);
 if(page==="users")return drawUsers(c);
 if(page==="createUsers")return drawCreateUsers(c);
 if(page==="assignRoles")return drawAssignUserRoles(c);
 if(page==="roleSummaryPage")return drawRoleSummaryPage(c);
 if(page==="miles")return drawQuickUpdate(c,"miles","Update Miles");
 if(page==="amount")return drawAmountUpdate(c);
 if(page==="destination")return drawDestinationUpdate(c);
 if(page==="accounts")return drawAdminAccounts(c);
 if(page==="expenses")return drawExpenses(c);
 if(page==="invoices")return drawInvoices(c);
 if(page==="payments")return drawPayments(c);
 if(page==="pendingPayments")return drawPendingPayments(c);
 if(page==="accountReports")return drawAccountReports(c);
 if(page==="pnl")return drawProfitLoss(c);
 if(page==="hr")return drawHR(c);
 if(page==="hrRegister")return drawEmployeeRegistration(c);
 if(page==="hrHolidays")return drawHRHolidays(c);
 if(page==="hrPayslips")return drawHRPayslips(c);
 if(page==="hrNonResidents")return drawNonResidentRecords(c);
 if(page==="hrShareCodes")return drawShareCodeRecords(c);
 if(page==="hrDvla")return drawDVLARecords(c);
 if(page==="settings")return drawSettings(c);
 if(page==="driver")return drawDriver(c);
}

let selectedClientStatus="New Booked Vehicle";
function openClientStatusPage(status){
 selectedClientStatus=status;
 page="clientStatusPage";
 render();
}
function showEvidence(ref){
 const b=getStore().bookings.find(x=>x.ref===ref);
 if(!b)return;
 const existing=document.getElementById("evidenceOverlay");if(existing)existing.remove();
 const wrap=document.createElement("div");wrap.id="evidenceOverlay";wrap.style.cssText="position:fixed;inset:0;background:#0008;z-index:9999;overflow:auto;padding:24px";
 wrap.innerHTML=`<div style="max-width:1100px;margin:auto"><div class="actions"><button class="btn secondary" onclick="document.getElementById('evidenceOverlay').remove()">Close</button></div>${evidenceSection(b)}</div>`;
 document.body.appendChild(wrap);
}
function drawClientStatusPage(c){
 const rows=visibleBookings().filter(b=>b.status===selectedClientStatus);
 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h2 style="margin:0">${selectedClientStatus==="Driver Assigned"?"Assigned to Driver":selectedClientStatus}</h2><p class="muted">All booking details for your business.</p></div>
   <button class="btn secondary" onclick="page='desktop';render()">Back to Client Dashboard</button>
  </div>
 </div>
 <div class="panel">
  <div class="scroll"><table style="min-width:1450px">
   <tr><th>Booking Ref</th><th>Vehicle</th><th>Reg No</th><th>Collection</th><th>Delivery</th><th>Service</th><th>Miles</th><th>Booking Date</th><th>Delivery Date</th><th>Receiver</th><th>Mobile</th><th>Drop-off Till</th><th>Driver</th><th>Amount</th><th>Payment</th><th>Invoice</th><th>Status</th><th>Evidence</th></tr>
   ${rows.map(b=>`<tr><td><b>${b.ref}</b></td><td>${b.vehicle}</td><td>${b.reg}</td><td>${b.pickup}</td><td>${b.destination}</td><td>${b.service}</td><td>${b.miles||0}</td><td>${b.bookingDate||"—"}</td><td>${b.deliveryDate||"—"}</td><td>${b.receiver||"—"}</td><td>${b.receiverMobile||"—"}</td><td>${b.dropoffTill||"—"}</td><td>${b.driver||"Not assigned"}</td><td>£${Number(b.amount||0).toFixed(2)}</td><td><span class="badge ${(b.paymentStatus==="Paid")?"green":"amber"}">${b.paymentStatus==="Paid"?"Paid":"Not Paid"}</span></td><td>${b.invoiceNo||"—"}</td><td><span class="badge">${b.status}</span></td><td><button class="btn secondary" onclick="showEvidence(\'${b.ref}\')">View Pictures</button></td></tr>`).join("")}
  </table></div>
  ${rows.length?"":"<p class='muted'>No vehicles currently in this status.</p>"}
 </div>`;
}

function drawClientBookings(c){
 const rows=visibleBookings();
 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h2 style="margin:0">Bookings / Tracking</h2><p class="muted" style="margin:6px 0 0">All booking details for your business account.</p></div>
   <button class="btn primary" onclick="page='booking';render()">Create Booking</button>
  </div>
 </div>
 <div class="panel" style="margin-top:12px"><div class="scroll">
  <table style="min-width:1800px">
   <tr><th>Booking Ref</th><th>Vehicle</th><th>Reg</th><th>Collection</th><th>Delivery</th><th>Service</th><th>Miles</th><th>Booking Date</th><th>Delivery Date</th><th>Receiver</th><th>Mobile</th><th>Driver</th><th>Status</th><th>Amount</th><th>Payment</th><th>Invoice</th><th>Action</th></tr>
   ${rows.length?rows.map(b=>`<tr>
    <td><b>${b.ref}</b></td><td>${b.vehicle||"—"}</td><td>${b.reg||"—"}</td><td>${b.pickup||"—"}</td><td>${b.destination||"—"}</td><td>${b.service||"—"}</td><td>${b.miles||0}</td><td>${b.bookingDate||"—"}</td><td>${b.deliveryDate||"—"}</td><td>${b.receiver||"—"}</td><td>${b.receiverMobile||"—"}</td><td>${b.driver||"Not assigned"}</td><td><span class="badge">${b.status}</span></td><td>${currency(b.amount)}</td><td><span class="badge ${b.paymentStatus==="Paid"?"green":"amber"}">${b.paymentStatus==="Paid"?"Paid":"Not Paid"}</span></td><td>${b.invoiceNo||"—"}</td><td><button class="btn secondary" onclick="clientViewBooking('${b.ref}')">View</button> <button class="btn secondary" onclick="showEvidence('${b.ref}')">Pictures</button></td>
   </tr>`).join(""):`<tr><td colspan="17">No bookings found for this business account.</td></tr>`}
  </table></div></div><div id="clientBookingDetail"></div>`;
}
function clientViewBooking(ref){
 const b=visibleBookings().find(x=>x.ref===ref),box=document.getElementById("clientBookingDetail");
 if(!b||!box)return;
 box.innerHTML=`<div class="panel" style="margin-top:12px"><h3>${b.ref} — ${b.vehicle}</h3>
  <div class="form">
   <div><b>Status</b><p><span class="badge">${b.status}</span></p></div>
   <div><b>Driver</b><p>${b.driver||"Not assigned"}</p></div>
   <div><b>Collection</b><p>${b.pickup||"—"}</p></div>
   <div><b>Delivery</b><p>${b.destination||"—"}</p></div>
   <div><b>Receiver</b><p>${b.receiver||"—"}</p></div>
   <div><b>Receiver Mobile</b><p>${b.receiverMobile||"—"}</p></div>
   <div><b>Amount</b><p>${currency(b.amount)}</p></div>
   <div><b>Payment</b><p>${b.paymentStatus==="Paid"?"Paid":"Not Paid"}</p></div>
  </div>
  <h4>Journey Timeline</h4>
  ${(b.timeline||[]).map(e=>`<div class="event"><b>${e.title}</b><div class="muted">${e.text}</div></div>`).join("")||"<p class='muted'>No timeline events yet.</p>"}
 </div>`;
 box.scrollIntoView({behavior:"smooth"});
}


function drawClientTracking(c){
 c.innerHTML=`<div class="panel">
  <h2>Tracking</h2>
  <p class="muted">Enter your Booking Reference to see the full journey from booking creation to delivery.</p>
  <input id="clientTrackRef" placeholder="Example: BK00129" style="width:100%;padding:13px;border:1px solid var(--line);border-radius:8px;text-transform:uppercase">
  <div class="actions"><button class="btn primary" onclick="findClientTracking()">Track Booking</button></div>
 </div>
 <div id="clientTrackingResult"></div>`;
 const el=document.getElementById("clientTrackRef");
 if(el)el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();findClientTracking()}});
}
function findClientTracking(){
 const ref=document.getElementById("clientTrackRef")?.value.trim().toUpperCase();
 const b=visibleBookings().find(x=>String(x.ref||"").toUpperCase()===ref);
 const box=document.getElementById("clientTrackingResult");
 if(!box)return;
 if(!b){box.innerHTML=`<div class="panel" style="margin-top:12px"><b>Booking not found for your business.</b></div>`;return}

 const ordered=[
  ["Booking Created","New Booked Vehicle"],
  ["Driver Assigned","Driver Assigned"],
  ["Picked Up","Picked Up"],
  ["On Route","On Route"],
  ["Delayed","Delayed"],
  ["Accident","Accident"],
  ["Claims","Claims"],
  ["Fault On Route","Fault On Route"],
  ["Assigned AA on Route","Assigned AA on Route"],
  ["Delivered","Delivered"]
 ];
 const history=(b.timeline||[]).slice().reverse();

 box.innerHTML=`<div class="panel" style="margin-top:12px">
  <h3>${b.ref} — ${b.vehicle}</h3>
  <div class="form">
   <div><b>Registration</b><p>${b.reg||"—"}</p></div>
   <div><b>Current Status</b><p><span class="badge">${b.status}</span></p></div>
   <div><b>Collection</b><p>${b.pickup||"—"}</p></div>
   <div><b>Delivery</b><p>${b.destination||"—"}</p></div>
   <div><b>Driver</b><p>${b.driver||"Not assigned"}</p></div>
   <div><b>Receiver</b><p>${b.receiver||"—"} · ${b.receiverMobile||"—"}</p></div>
  </div>
  <h4>Tracking Timeline</h4>
  ${history.length?history.map(e=>`<div class="event"><b>${e.title}</b><div class="muted">${e.text}</div></div>`).join(""):`<div class="event"><b>Booking Created</b><div class="muted">${b.bookingDate||"—"}</div></div>`}
  <div class="panel" style="margin-top:12px;background:#f9fbfe"><b>Current Position in Workflow:</b> ${b.status}</div>
 </div>`;
}

function drawClientInvoices(c){
 const s=ensureAccountsData(),businessName=currentUser?.name||"Prestige Motors Ltd";
 const invoices=(s.invoices||[]).filter(i=>i.business===businessName);
 c.innerHTML=`<div class="panel"><h2>Invoices</h2><p class="muted">Invoices generated by UK On Wheels for your business appear here.</p>
 <div class="scroll"><table style="min-width:1200px"><tr><th>Invoice</th><th>Date</th><th>Due Date</th><th>Vehicles</th><th>Subtotal</th><th>VAT</th><th>Extras</th><th>Total</th><th>Status</th><th>Payment Date</th><th>Action</th></tr>
 ${invoices.map(i=>`<tr><td><b>${i.invoiceNo}</b></td><td>${i.date||"—"}</td><td>${i.dueDate||"—"}</td><td>${i.vehicleCount||0}</td><td>${currency(i.subtotal)}</td><td>${currency(i.vatAmount)}</td><td>${currency(i.extraTotal)}</td><td><b>${currency(i.total)}</b></td><td><span class="badge ${i.status==="Paid"?"green":"amber"}">${i.status}</span></td><td>${i.paymentDate||"—"}</td><td><button class="btn secondary" onclick="viewInvoice('${i.invoiceNo}')">View Invoice</button></td></tr>`).join("")}
 </table></div>${invoices.length?"":"<p class='muted'>No invoices generated yet.</p>"}</div>`;
}

function drawClientReports(c){
 c.innerHTML=`<div class="panel"><h2>Reports</h2>
 <div class="form">
  <select id="clientReportType">
   <option value="Delivered">Delivered Vehicles Report</option>
   <option value="Picked Up">Picked Up Report</option>
   <option value="Delayed">Delayed Vehicle Report</option>
   <option value="Claims">Claim Report</option>
   <option value="Accident">Accident Report</option>
   <option value="Recovery">Recovery Report</option>
   <option value="Charges">Charges Report</option>
  </select>
  <input id="clientReportFrom" type="date">
  <input id="clientReportTo" type="date">
 </div>
 <div class="actions"><button class="btn primary" onclick="runClientReport()">Run Report</button></div>
 </div><div id="clientReportResult"></div>`;
}
function runClientReport(){
 const type=document.getElementById("clientReportType").value,from=document.getElementById("clientReportFrom").value,to=document.getElementById("clientReportTo").value;
 let rows=visibleBookings();
 const inRange=b=>{
   const d=b.deliveryDate||b.bookingDate||"";
   if(from&&d<from)return false;
   if(to&&d>to)return false;
   return true;
 };
 rows=rows.filter(inRange);

 if(type==="Delivered")rows=rows.filter(b=>b.status==="Delivered");
 else if(type==="Picked Up")rows=rows.filter(b=>["Picked Up","On Route","Delayed","Delivered","Fault On Route","Assigned AA on Route","Accident","Claims"].includes(b.status));
 else if(type==="Delayed")rows=rows.filter(b=>b.status==="Delayed");
 else if(type==="Claims")rows=rows.filter(b=>b.status==="Claims");
 else if(type==="Accident")rows=rows.filter(b=>b.status==="Accident");
 else if(type==="Recovery")rows=rows.filter(b=>b.status==="Assigned AA on Route"||b.status==="Fault On Route");
 // Charges = all rows with amount

 const box=document.getElementById("clientReportResult");
 box.innerHTML=`<div class="panel" style="margin-top:12px"><h3>${type} Report</h3><div class="scroll"><table style="min-width:1300px">
 <tr><th>Booking Ref</th><th>Vehicle</th><th>Reg</th><th>Collection</th><th>Delivery</th><th>Status</th><th>Booking Date</th><th>Delivery Date</th><th>Amount</th><th>Payment</th><th>Invoice</th></tr>
 ${rows.map(b=>`<tr><td><b>${b.ref}</b></td><td>${b.vehicle||"—"}</td><td>${b.reg||"—"}</td><td>${b.pickup||"—"}</td><td>${b.destination||"—"}</td><td><span class="badge">${b.status}</span></td><td>${b.bookingDate||"—"}</td><td>${b.deliveryDate||"—"}</td><td>${currency(b.amount)}</td><td>${b.paymentStatus==="Paid"?"Paid":"Not Paid"}</td><td>${b.invoiceNo||"—"}</td></tr>`).join("")}
 </table></div>${rows.length?"":"<p class='muted'>No records found for this report.</p>"}</div>`;
}
function drawClientPayments(c){
 const s=ensureAccountsData();
 const businessName=currentUser?.name||"Prestige Motors Ltd";
 const paidInvoices=(s.invoices||[]).filter(i=>i.business===businessName && i.status==="Paid");

 const totalPaid=paidInvoices.reduce((a,i)=>a+Number(i.paidAmount||i.total||0),0);

 c.innerHTML=`<div class="panel">
  <h2>Payments</h2>
  <p class="muted">This page shows paid invoices only.</p>
 </div>

 <div class="cards" style="margin-top:12px">
  <div class="card"><b>Paid Invoices</b><strong>${paidInvoices.length}</strong><small>Completed payments</small></div>
  <div class="card"><b>Total Paid</b><strong>${currency(totalPaid)}</strong><small>Across paid invoices</small></div>
 </div>

 <div class="panel" style="margin-top:12px">
  <h3>Paid Invoice History</h3>
  <div class="scroll">
   <table style="min-width:1350px">
    <tr>
     <th>Invoice No</th>
     <th>Invoice Date</th>
     <th>Payment Date</th>
     <th>Vehicles</th>
     <th>Subtotal</th>
     <th>VAT</th>
     <th>Extras</th>
     <th>Total Paid</th>
     <th>Payment Method</th>
     <th>Payment Reference</th>
     <th>Status</th>
     <th>Action</th>
    </tr>
    ${paidInvoices.length?paidInvoices.map(i=>`<tr>
      <td><b>${i.invoiceNo}</b></td>
      <td>${i.date||"—"}</td>
      <td>${i.paymentDate||"—"}</td>
      <td>${i.vehicleCount||0}</td>
      <td>${currency(i.subtotal)}</td>
      <td>${currency(i.vatAmount)}</td>
      <td>${currency(i.extraTotal)}</td>
      <td><b>${currency(i.paidAmount||i.total)}</b></td>
      <td>${i.paymentMethod||"—"}</td>
      <td>${i.paymentReference||"—"}</td>
      <td><span class="badge green">Paid</span></td>
      <td><button class="btn secondary" onclick="viewInvoice('${i.invoiceNo}')">View Invoice</button></td>
    </tr>`).join(""):`<tr><td colspan="12">No paid invoices yet.</td></tr>`}
   </table>
  </div>
 </div>`;
}
function drawClientBusinessProfile(c){
 const s=getStore(),businessName=currentUser?.name||"Prestige Motors Ltd";
 const b=s.businesses.find(x=>x.name===businessName)||{};
 c.innerHTML=`<div class="panel"><h2>Business Profile</h2><div class="form">
  <div><b>Business Name</b><p>${b.name||businessName}</p></div>
  <div><b>Business Type</b><p>${b.type||"—"}</p></div>
  <div><b>Address</b><p>${b.address||"—"}</p></div>
  <div><b>Post Code</b><p>${b.postcode||"—"}</p></div>
  <div><b>Email</b><p>${b.email||"—"}</p></div>
  <div><b>Phone</b><p>${b.phone||"—"}</p></div>
  <div><b>VAT Number</b><p>${b.vatNumber||"—"}</p></div>
  <div><b>Company Registration</b><p>${b.companyReg||"—"}</p></div>
  <div><b>Branches</b><p>${b.branches||"—"}</p></div>
  <div><b>Invoice Cycle</b><p>${b.invoiceCycle||"—"}</p></div>
  <div><b>Accounts Contact</b><p>${b.accountsName||"—"}</p></div>
  <div><b>Accounts Phone</b><p>${b.accountsPhone||"—"}</p></div>
  <div><b>Accounts Email</b><p>${b.accountsEmail||"—"}</p></div>
  <div><b>Tariff Type</b><p>${b.tariffType||"—"}</p></div>
  <div><b>Per Mile</b><p>${b.perMile?currency(b.perMile):"—"}</p></div>
  <div><b>Minimum Charge</b><p>${b.minimumCharge?currency(b.minimumCharge):"—"}</p></div>
 </div>
 <p class="muted">Business master details are controlled by UK On Wheels Admin. Contact us if anything needs changing.</p></div>`;
}

function ensureClientUsersData(){
 let s=getStore(),changed=false;
 if(!s.clientUsers){s.clientUsers=[];changed=true}
 if(changed)saveStore(s);
 return getStore();
}
function drawClientUsers(c){
 const s=ensureClientUsersData(),businessName=currentUser?.name||"Prestige Motors Ltd";
 const users=(s.clientUsers||[]).filter(u=>u.business===businessName); users.forEach(u=>{if(!u.status||u.status==="Inactive")u.status="Active"});
 c.innerHTML=`<div class="panel"><h2>Users / Access</h2><p class="muted">Create additional users for your business account.</p>
 <div class="form">
  <input id="cluName" placeholder="Full Name *" autocomplete="name">
  <input id="cluEmail" type="email" placeholder="Email Address *" autocomplete="email">
  <input id="cluPhone" type="tel" placeholder="Mobile Number *" autocomplete="tel">
  <input id="cluPassword" type="password" placeholder="Password *" autocomplete="new-password">
  <select id="cluAccess"><option>Booking & Tracking</option><option>Accounts / Invoices</option><option>Full Client Access</option></select>
 </div><div class="actions"><button class="btn primary" onclick="createClientUser()">Create Client User</button></div></div>
 <div class="panel" style="margin-top:12px"><h3>Business Users</h3><table><tr><th>Full Name</th><th>Email Address</th><th>Mobile Number</th><th>Access</th><th>Status</th><th>Last Status Change</th><th>Action</th></tr>
 ${users.map(u=>`<tr>
 <td>${u.name}</td>
 <td>${u.email}</td>
 <td>${u.phone||"—"}</td>
 <td>${u.access}</td>
 <td><span class="badge ${u.status==="Active"?"green":"red"}">${u.status||"Active"}</span></td>
 <td>${u.statusChangedAt||"—"}</td>
 <td>
  <button class="btn secondary" onclick="changeClientUserPassword('${u.id}')">Change Password</button>
  <button class="btn ${u.status==="Disabled"?"primary":"danger"}" onclick="toggleClientUserStatus('${u.id}')">${u.status==="Disabled"?"Activate":"Disable"}</button>
 </td>
 </tr>`).join("")}</table></div>`;
}
function toggleClientUserStatus(id){
 let s=ensureClientUsersData();
 const u=(s.clientUsers||[]).find(x=>x.id===id);
 if(!u)return alert("Client user not found.");

 if(u.status==="Disabled"){
   if(!confirm(`Activate ${u.name}'s account now?`))return;
   u.status="Active";
   u.activatedAt=new Date().toLocaleString();
   u.statusChangedAt=u.activatedAt;
   u.statusChangedBy=currentUser?.userName||currentUser?.name||"Client Administrator";
   saveStore(s);
   alert(`${u.name} is now Active and can sign in again.`);
 }else{
   if(!confirm(`Disable ${u.name}'s account? They will not be able to sign in until activated again.`))return;
   u.status="Disabled";
   u.disabledAt=new Date().toLocaleString();
   u.statusChangedAt=u.disabledAt;
   u.statusChangedBy=currentUser?.userName||currentUser?.name||"Client Administrator";
   saveStore(s);
   alert(`${u.name} is now Disabled.`);
 }
 drawClientUsers(document.getElementById("content"));
}
function changeClientUserPassword(id){
 let s=ensureClientUsersData(),u=(s.clientUsers||[]).find(x=>x.id===id);
 if(!u)return;
 const p=prompt("Enter a new password for "+u.name+":");
 if(p===null)return;
 if(p.length<8)return alert("Password must be at least 8 characters.");
 u.password=p;
 u.passwordChangedAt=new Date().toLocaleString();
 saveStore(s);
 alert("Password changed successfully.");
}
async function createClientUser(){
 let s=ensureClientUsersData(),business=currentUser?.name||"Prestige Motors Ltd";
 const name=document.getElementById("cluName").value.trim();
 const email=document.getElementById("cluEmail").value.trim().toLowerCase();
 const phone=document.getElementById("cluPhone").value.trim();
 const password=document.getElementById("cluPassword").value;
 const access=document.getElementById("cluAccess").value;

 if(!name||!email||!phone||!password)return alert("Full name, email address, mobile number and password are required.");
 if(!email.includes("@"))return alert("Please enter a valid email address.");
 if(password.length<8)return alert("Password must be at least 8 characters.");
 if((s.clientUsers||[]).some(u=>String(u.email||"").toLowerCase()===email))return alert("A client user with this email address already exists.");

 s.clientUsers.push({
   id:"CLU-"+Date.now(),
   business,name,email,phone,
   password,
   access,
   status:"Active",
   createdAt:new Date().toLocaleString()
 });
 saveStore(s);
 await supabaseCreateLogin(email,password,{name,role:"client",business_name:business,client_user_name:name,client_access:access});
 alert("Client user created successfully.");
 drawClientUsers(document.getElementById("content"));
}

function drawClientNotifications(c){
 const s=ensureMessagingSettings(),businessName=currentUser?.name||"Prestige Motors Ltd";
 const refs=new Set(visibleBookings().map(b=>b.ref));
 const notices=(s.notifications||[]).filter(n=>!n.targetRole).slice(0,50);
 const msgs=(s.messageLog||[]).filter(m=>refs.has(m.bookingRef)).slice().reverse();
 c.innerHTML=`<div class="panel"><h2>Notifications</h2>${notices.map(n=>`<div class="event"><b>${n.title}</b><div class="muted">${n.text}</div></div>`).join("")||"<p class='muted'>No notifications yet.</p>"}</div>
 <div class="panel" style="margin-top:12px"><h3>Customer Message Activity</h3><div class="scroll"><table style="min-width:1100px"><tr><th>Booking</th><th>Event</th><th>Channel</th><th>Receiver</th><th>Mobile</th><th>Status</th><th>Date/Time</th></tr>
 ${msgs.map(m=>`<tr><td>${m.bookingRef}</td><td>${m.event}</td><td>${m.channel}</td><td>${m.receiverName||"—"}</td><td>${m.mobile||"—"}</td><td>${m.status}</td><td>${m.createdAt}</td></tr>`).join("")}</table></div></div>`;
}

function ensureClientPortalSettings(){
 let s=getStore(),changed=false;
 const business=currentUser?.name||"Prestige Motors Ltd";
 if(!s.clientPortalSettings){s.clientPortalSettings={};changed=true}
 if(!s.clientPortalSettings[business]){
   s.clientPortalSettings[business]={invoiceAccess:true};
   changed=true;
 }
 if(changed)saveStore(s);
 return getStore();
}
function clientInvoiceAccessEnabled(){
 const s=ensureClientPortalSettings();
 const business=currentUser?.name||"Prestige Motors Ltd";
 return s.clientPortalSettings?.[business]?.invoiceAccess!==false;
}
function toggleClientInvoiceAccess(){
 let s=ensureClientPortalSettings();
 const business=currentUser?.name||"Prestige Motors Ltd";
 const box=document.getElementById("clientInvoiceAccessToggle");
 s.clientPortalSettings[business].invoiceAccess=!!box?.checked;
 saveStore(s);
 alert("Invoice access is now "+(s.clientPortalSettings[business].invoiceAccess?"ON":"OFF")+".");
 render();
}
function drawClientSettings(c){
 const s=ensureClientPortalSettings();
 const business=currentUser?.name||"Prestige Motors Ltd";
 const invoiceAccess=s.clientPortalSettings?.[business]?.invoiceAccess!==false;
 c.innerHTML=`<div class="panel"><h2>Client Settings</h2>
  <div class="cards">
   <div class="card"><b>Business Access</b><strong>Active</strong><small>${business}</small></div>
   <div class="card"><b>Booking Notifications</b><strong>On</strong><small>WhatsApp / SMS managed by Admin</small></div>
   <div class="card">
    <b>Invoice Access</b>
    <strong>${invoiceAccess?"On":"Off"}</strong>
    <small>${invoiceAccess?"Invoices are visible":"Invoices are hidden"}</small>
   </div>
  </div>
  <div class="panel" style="margin-top:12px">
   <h3>Invoice Access Control</h3>
   <label class="step" style="margin:0">
    <input id="clientInvoiceAccessToggle" type="checkbox" ${invoiceAccess?"checked":""} onchange="toggleClientInvoiceAccess()">
    Allow this business account to view invoices
   </label>
   <p class="muted">Turn this off to hide invoice access from the Client Portal. Admin can still generate and manage invoices.</p>
  </div>
  <p class="muted">Tariff, payment terms and messaging API settings remain controlled by UK On Wheels Admin.</p>
 </div>`;
}

function repairClientDashboardData(){
 migrateClientData();
 alert("Client dashboard data refreshed.");
 page="desktop";
 render();
}
function drawClientDashboard(c){
 const s=getStore();
 const rows=(s.bookings||[]).filter(b=>(b.customerType||"Business")!=="Private" && b.business===(currentUser?.name||"Prestige Motors Ltd"));
 const businessName=currentUser?.name||"Prestige Motors Ltd";
 const count=status=>rows.filter(b=>b.status===status).length;
 const invoiceCount=(s.invoices||[]).filter(i=>i.business===businessName).length;
 const outstanding=rows.filter(b=>b.paymentStatus!=="Paid").reduce((a,b)=>a+Number(b.amount||0),0);

 const cards=[
  ["New Booked Vehicle","New Booked Vehicle"],
  ["Assigned to Driver","Driver Assigned"],
  ["Picked Up","Picked Up"],
  ["On Route","On Route"],
  ["Delayed","Delayed"],
  ["Delivered","Delivered"],
  ["Claims","Claims"],
  ["Accident","Accident"],
  ["Assigned AA on Route","Assigned AA on Route"]
 ];

 c.innerHTML=`<div class="clientHero">
  <h1>Welcome to UK On Wheels Client Portal</h1>
  <p>${businessName}</p>
 </div>

 <div class="actions" style="margin:12px 0">
  <button class="btn primary" onclick="page='booking';render()">Create Booking</button>
  <button class="btn secondary" onclick="page='clientBookings';render()">View Bookings</button>
  <button class="btn secondary" onclick="page='clientTracking';render()">Track Vehicle</button>
 </div>

 <div class="panel">
  <h3 style="margin-top:0">Vehicle Status Overview</h3>
  <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));">
   ${cards.map(([label,status])=>`<div class="card" style="cursor:pointer;min-height:120px" onclick="openClientStatusPage('${status}')">
     <b>${label}</b><strong>${count(status)}</strong><small>Click to view</small>
   </div>`).join("")}
  </div>
 </div>

 <div class="cards" style="margin-top:12px">
  <div class="card"><b>Total Bookings</b><strong>${rows.length}</strong></div>
  <div class="card"><b>Invoices</b><strong>${invoiceCount}</strong></div>
  <div class="card"><b>Outstanding</b><strong>£${Number(outstanding).toFixed(2)}</strong></div>
 </div>

 <div class="panel">
  <h3>Recent Bookings</h3>
  <div class="scroll"><table style="min-width:1200px">
   <tr><th>Booking Ref</th><th>Vehicle</th><th>Reg</th><th>Collection</th><th>Delivery</th><th>Status</th><th>Amount</th><th>Payment</th><th>Evidence</th></tr>
   ${rows.length?rows.slice().reverse().map(b=>`<tr>
    <td><b>${b.ref}</b></td><td>${b.vehicle||"—"}</td><td>${b.reg||"—"}</td><td>${b.pickup||"—"}</td><td>${b.destination||"—"}</td>
    <td><span class="badge">${b.status}</span></td><td>£${Number(b.amount||0).toFixed(2)}</td>
    <td><span class="badge ${b.paymentStatus==="Paid"?"green":"amber"}">${b.paymentStatus==="Paid"?"Paid":"Not Paid"}</span></td>
    <td><button class="btn secondary" onclick="showEvidence('${b.ref}')">View Pictures</button></td>
   </tr>`).join(""):`<tr><td colspan="9">No bookings yet.</td></tr>`}
  </table></div>
 </div>`;
}


/* === RESTORED ADMIN MODULES === */
let selectedRoleSummary="Super Admin";
let selectedStatusPage="New Booked Vehicle";

function clientStatus(status){
 const rows=visibleBookings().filter(b=>b.status===status);
 clientStatusArea.innerHTML=`<div class="panel" style="margin-top:12px"><h3>${status==="Driver Assigned"?"Assigned to Driver":status}</h3><div class="scroll"><table style="min-width:1000px"><tr><th>Booking Ref</th><th>Vehicle</th><th>Reg</th><th>Collection</th><th>Delivery</th><th>Driver</th><th>Receiver</th><th>Status</th></tr>
 ${rows.map(b=>`<tr><td>${b.ref}</td><td>${b.vehicle}</td><td>${b.reg}</td><td>${b.pickup}</td><td>${b.destination}</td><td>${b.driver||"Not assigned"}</td><td>${b.receiver||"—"}</td><td><span class="badge">${b.status}</span></td></tr>`).join("")}</table></div>${rows.length?"":"<p class='muted'>No vehicles in this status.</p>"}</div>`;
 clientStatusArea.scrollIntoView({behavior:"smooth"});
}


function ensureAdminDemoData(){
 let s=getStore(),changed=false;
 s.bookings=s.bookings||[];
 s.businesses=s.businesses||[];
 s.notifications=s.notifications||[];
 if(!s.businesses.some(b=>b.name==="Prestige Motors Ltd")){
   s.businesses.push({name:"Prestige Motors Ltd",email:"client@ukonwheels.co.uk",invoiceCycle:"Monthly",tariffType:"Custom Tariff"});
   changed=true;
 }
 if(s.bookings.length===0){
   s.bookings.push(
    {ref:"BK00129",customerType:"Business",business:"Prestige Motors Ltd",vehicle:"Ford Transit Custom",reg:"AB12 CDE",pickup:"Manchester",destination:"Birmingham",service:"Vehicle Delivery",miles:85,bookingDate:"2026-08-19",deliveryDate:"",receiver:"John Smith",receiverMobile:"07700 900123",status:"New Booked Vehicle",amount:145,paymentStatus:"Pending",driver:"",timeline:[{title:"Booking Created",text:"Demo booking created."}]},
    {ref:"BK00130",customerType:"Business",business:"Prestige Motors Ltd",vehicle:"BMW 320d",reg:"XY21 ABC",pickup:"Glasgow",destination:"Edinburgh",service:"Vehicle Delivery",miles:48,bookingDate:"2026-08-18",deliveryDate:"2026-08-18",receiver:"John Smith",receiverMobile:"07700 900123",status:"Delivered",amount:180,paymentStatus:"Pending",driver:"James Wilson",timeline:[{title:"Delivered",text:"Demo delivered booking."}]}
   );
   changed=true;
 }
 if(changed)saveStore(s);
 return s;
}

function drawAdminDashboard(c){
 ensureAdminDemoData();
 const s=getStore(),rows=s.bookings;
 const stats=[
  ["🚘","New Booked Vehicles","New Booked Vehicle"],["👤","Driver Assigned","Driver Assigned"],["🚚","Picked Up Vehicles","Picked Up"],
  ["🚛","On Route","On Route"],["◷","Delayed","Delayed"],["🚨","Accidents","Accident"],["▤","Claims","Claims"],
  ["✓","Delivered","Delivered"],["⚠","Faults On The Route","Fault On Route"],["AA","Assigned AA On Route","Assigned AA on Route"],["🏁","Total Vehicles Delivered","Delivered"]
 ];
 const count=t=>rows.filter(b=>b.status===t).length;
 const delivered=count("Delivered"), delayed=count("Delayed"), accidents=count("Accident"), claims=count("Claims"), onroute=count("On Route");
 const total=rows.length;
 const paidTotal=rows.reduce((a,b)=>a+Number(b.amount||0),0);
 const driverNames=[...new Set(rows.map(b=>b.driver).filter(Boolean))];
 const destinations={}; rows.forEach(b=>destinations[b.destination]=(destinations[b.destination]||0)+1);
 const topDest=Object.entries(destinations).sort((a,b)=>b[1]-a[1]).slice(0,5);
 c.innerHTML=`
 <div class="adminWelcome"><div class="mark">UK <span>ON</span><br>WHEELS</div><h1>Welcome to UK On Wheels Portal</h1></div>
 <div class="adminNotice">
  <div class="speaker">📣</div>
  <div><b>Notifications & Announcements</b><div class="muted">Share important news, updates or alerts with staff and clients.</div></div>
  <input id="adminNoticeText" placeholder="Type your announcement here...">
  <button class="btn primary" onclick="postAdminAnnouncement()">Post Update</button>
 </div>

 <div class="panel" style="padding:0;overflow:hidden">
  <div style="padding:14px 16px 4px"><h3 style="margin:0">Vehicle Status Overview</h3></div>
  <div class="adminStats">
   ${stats.map(([i,label,status],idx)=>`<div class="adminStat" onclick="openStatusPage('${status}')"><div class="ico">${i}</div><b>${label}</b><strong>${idx===10?delivered:count(status)}</strong><small>${idx===10?"This Month":"Live"}</small></div>`).join("")}
  </div>
 </div>

 <div class="adminGridTop">
  <div class="panel"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Recent Bookings</h3><span class="muted">${rows.length} total</span></div>
   <div class="scroll"><table><tr><th>Booking ID</th><th>Business</th><th>Pickup</th><th>Destination</th><th>Date</th><th>Status</th><th>Driver</th><th>Amount</th><th>Payment</th></tr>
   ${rows.slice(0,7).map(b=>`<tr><td><b>${b.ref}</b></td><td>${b.business}</td><td>${b.pickup}</td><td>${b.destination}</td><td>${b.bookingDate||"—"}</td><td><span class="badge">${b.status}</span></td><td>${b.driver||"Not assigned"}</td><td>£${Number(b.amount||0).toFixed(2)}</td><td><span class="badge ${(b.paymentStatus==="Paid")?"green":"amber"}">${b.paymentStatus==="Paid"?"Paid":"Not Paid"}</span></td></tr>`).join("")}
   </table></div>
  </div>
  <div class="panel"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Vehicle Status Distribution</h3><span class="muted">This Month</span></div>
   <div class="adminDonut"></div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
    ${stats.slice(0,10).map(([i,l,st])=>`<div>${i} ${l} <b>${count(st)}</b></div>`).join("")}
   </div>
  </div>
 </div>

 <div class="kpiRow">
  <div class="kpi"><b>Total Bookings</b><strong>${total}</strong><span class="muted">This Month</span></div>
  <div class="kpi"><b>Total Vehicles Delivered</b><strong>${delivered}</strong><span class="muted">This Month</span></div>
  <div class="kpi"><b>On Route Vehicles</b><strong>${onroute}</strong><span class="muted">Live</span></div>
  <div class="kpi"><b>Delayed Vehicles</b><strong>${delayed}</strong><span class="muted">Live</span></div>
  <div class="kpi"><b>Accidents</b><strong>${accidents}</strong><span class="muted">Recorded</span></div>
  <div class="kpi"><b>Claims Raised</b><strong>${claims}</strong><span class="muted">Recorded</span></div>
 </div>

 <div class="adminGridBottom">
  <div class="panel"><h3>Driver Performance <span class="muted">(This Month)</span></h3>
   <table><tr><th>Driver</th><th>Assigned</th><th>Delivered</th><th>On Route</th><th>Delayed</th></tr>
   ${driverNames.length?driverNames.map(d=>{
      const assigned=rows.filter(b=>b.driver===d).length;
      return `<tr><td>${d}</td><td>${assigned}</td><td>${rows.filter(b=>b.driver===d&&b.status==="Delivered").length}</td><td>${rows.filter(b=>b.driver===d&&b.status==="On Route").length}</td><td>${rows.filter(b=>b.driver===d&&b.status==="Delayed").length}</td></tr>`;
   }).join(""):`<tr><td colspan="5">No driver activity yet.</td></tr>`}
   </table>
  </div>
  <div class="panel"><h3>Top Destinations <span class="muted">(This Month)</span></h3><ul class="topDest">
    ${topDest.length?topDest.map(([d,n])=>`<li><b>${d}</b><span style="float:right">${n} deliveries</span></li>`).join(""):"<li>No destination data yet.</li>"}
   </ul>
  </div>
  <div class="panel"><h3>Alerts & Notifications</h3><ul class="alerts">
    ${s.notifications.filter(n=>!n.targetRole || role==="admin" || currentStaffUser?.role===n.targetRole).slice(0,8).map(n=>`<li><b>${n.title}</b><div class="muted">${n.text}</div></li>`).join("")}
   </ul>
  </div>
 </div>

 <div id="adminStatusArea"></div>`;
}

function postAdminAnnouncement(){
 let s=getStore(),text=(document.getElementById("adminNoticeText").value||"").trim();
 if(!text)return alert("Please type an announcement.");
 s.notifications.unshift({title:"Admin Announcement",text});
 saveStore(s);drawAdminDashboard(document.getElementById("content"));
}

function adminStatus(status){
 const rows=getStore().bookings.filter(b=>b.status===status);
 adminStatusArea.innerHTML=`<div class="panel" style="margin-top:12px"><h3>${status}</h3><div class="scroll"><table style="min-width:1350px">
 <tr><th>Booking Ref</th><th>Vehicle</th><th>Reg</th><th>Collection</th><th>Delivery</th><th>Service</th><th>Miles</th><th>Booking Date</th><th>Delivery Date</th><th>Receiver</th><th>Mobile</th><th>Driver</th><th>Status</th></tr>
 ${rows.map(b=>`<tr><td>${b.ref}</td><td>${b.vehicle}</td><td>${b.reg}</td><td>${b.pickup}</td><td>${b.destination}</td><td>${b.service}</td><td>${b.miles||0}</td><td>${b.bookingDate||"—"}</td><td>${b.deliveryDate||"—"}</td><td>${b.receiver||"—"}</td><td>${b.receiverMobile||"—"}</td><td>${b.driver||"Not assigned"}</td><td><span class="badge">${b.status}</span></td></tr>`).join("")}
 </table></div>${rows.length?"":"<p class='muted'>No vehicles in this status.</p>"}</div>`;
 adminStatusArea.scrollIntoView({behavior:"smooth"});
}

function userRoleList(){
 return [
  "Super Admin","Admin","Operations Manager","Fleet Manager","Route Manager",
  "Transport Planner","Dispatcher","Sales Person","Accountant","Book Keeping",
  "HR Manager","HR Coordinator","Driver"
 ];
}

function allPermissionOptions(){
 return [
  ["desktop","Desktop / Dashboard"],
  ["booking","Create Booking"],
  ["businesses","Businesses / Clients"],
  ["assign","Assign Driver"],
  ["status","Status Update"],
  ["miles","Update Miles"],
  ["amount","Update Amount"],
  ["destination","Update Destination"],
  ["accounts","Accounts"],
  ["reports","Reports & Invoices"],
  ["hr","HR"],
  ["notifications","Notifications / Messaging"],
  ["settings","Settings / Admin Access"],
  ["users","Users"],
  ["driver","Driver Mobile App"]
 ];
}

function defaultPermissionsForRole(role){
 const map={
  "Super Admin":["desktop","booking","businesses","assign","status","miles","amount","destination","accounts","reports","hr","notifications","settings","users","driver"],
  "Admin":["desktop","booking","businesses","assign","status","miles","amount","destination","accounts","reports","hr","notifications","users"],
  "Operations Manager":["desktop","booking","businesses","assign","status","miles","destination","notifications"],
  "Fleet Manager":["desktop","assign","status","miles","driver"],
  "Route Manager":["desktop","assign","status","destination"],
  "Transport Planner":["desktop","booking","businesses","assign","destination"],
  "Dispatcher":["desktop","assign","status","notifications"],
  "Sales Person":["desktop","booking","businesses"],
  "Accountant":["desktop","accounts","reports","amount"],
  "Book Keeping":["desktop","accounts","reports"],
  "HR Manager":["desktop","hr","users"],
  "HR Coordinator":["desktop","hr"],
  "Driver":["driver"]
 };
 return map[role]||["desktop"];
}

function ensureStaffUsers(){
 let s=getStore();
 if(!s.staffUsers){
   s.staffUsers=[
    {name:"System Owner",email:"superadmin@ukonwheels.co.uk",phone:"",role:"Super Admin",status:"Active",permissions:defaultPermissionsForRole("Super Admin")},
    {name:"Operations Admin",email:"operations@ukonwheels.co.uk",phone:"",role:"Admin",status:"Active",permissions:defaultPermissionsForRole("Admin")},
    {name:"James Wilson",email:"driver@ukonwheels.co.uk",phone:"07123 456789",role:"Driver",status:"Active",permissions:defaultPermissionsForRole("Driver")}
   ];
   saveStore(s);
 } else {
   let changed=false;
   s.staffUsers.forEach(u=>{if(!u.permissions){u.permissions=defaultPermissionsForRole(u.role);changed=true;}});
   if(changed)saveStore(s);
 }
 return getStore();
}

function drawUsers(c){
 const s=ensureStaffUsers();
 const roles=userRoleList();
 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h2 style="margin:0">Users</h2><p class="muted" style="margin:6px 0 0">Create staff accounts and control exactly what each user can access.</p></div>
   <span class="badge">${s.staffUsers.length} users</span>
  </div>
 </div>

 <div class="cards" style="margin-top:12px">
  <div class="card" style="cursor:pointer" onclick="page='createUsers';render()"><b>Create Users</b><strong>＋</strong><small>Add staff and assign designation</small></div>
  <div class="card" style="cursor:pointer" onclick="page='assignRoles';render()"><b>Assign User Roles</b><strong>🔐</strong><small>Restrict pages and permissions</small></div>
 </div>

 <div class="panel">
  <h3>Role Summary</h3>
  <div class="cards">
   ${roles.map(r=>`<div class="card" style="cursor:pointer" onclick="openRoleSummaryPage('${r.replace(/'/g,"\'")}')"><b>${r}</b><strong>${s.staffUsers.filter(u=>u.role===r).length}</strong><small>Users</small></div>`).join("")}
  </div>
 </div>

 <div class="panel">
  <h3>Current Users</h3>
  <div class="scroll"><table style="min-width:1050px">
   <tr><th>Name</th><th>Email</th><th>Designation</th><th>Status</th><th>Allowed Areas</th></tr>
   ${s.staffUsers.map(u=>`<tr><td><b>${u.name}</b></td><td>${u.email}</td><td><span class="badge">${u.role}</span></td><td><span class="badge ${u.status==="Active"?"green":"amber"}">${u.status}</span></td><td>${(u.permissions||[]).length} areas</td></tr>`).join("")}
  </table></div>
 </div>`;
}

function openRoleSummaryPage(roleName){
 selectedRoleSummary=roleName;
 page="roleSummaryPage";
 render();
}

function drawRoleSummaryPage(c){
 const s=ensureStaffUsers();
 const users=s.staffUsers.filter(u=>u.role===selectedRoleSummary);
 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div>
    <h2 style="margin:0">${selectedRoleSummary}</h2>
    <p class="muted" style="margin:6px 0 0">All employees assigned to this role.</p>
   </div>
   <div>
    <span class="badge">${users.length} employees</span>
    <button class="btn secondary" onclick="page='users';render()">Back to Users</button>
   </div>
  </div>
 </div>

 <div class="panel" style="margin-top:12px">
  <div class="scroll">
   <table style="min-width:1700px">
    <tr>
     <th>Name</th>
     <th>Email</th>
     <th>Mobile</th>
     <th>Status</th>
     <th>Current Address</th>
     <th>Post Code</th>
     <th>Emergency Contact</th>
     <th>Emergency Number</th>
     <th>Driving Licence No.</th>
     <th>Licence Type</th>
     <th>Visa Status</th>
     <th>Right to Work Code</th>
     <th>Safety Certificate</th>
     <th>Allowed Areas</th>
     <th>Action</th>
    </tr>
    ${users.map(u=>{
      const originalIndex=s.staffUsers.indexOf(u);
      return `<tr>
       <td><b>${u.name||"—"}</b></td>
       <td>${u.email||"—"}</td>
       <td>${u.phone||"—"}</td>
       <td><span class="badge ${u.status==="Active"?"green":"amber"}">${u.status||"—"}</span></td>
       <td>${u.currentAddress||"—"}</td>
       <td>${u.currentPostcode||"—"}</td>
       <td>${u.emergencyName||"—"}</td>
       <td>${u.emergencyNumber||"—"}</td>
       <td>${u.drivingLicenceNo||"—"}</td>
       <td>${u.licenceType||"—"}</td>
       <td>${u.visaType||"—"}</td>
       <td>${u.rightToWorkShareCode||"—"}</td>
       <td>${u.safetyCertificate||"—"}</td>
       <td>${(u.permissions||[]).length} areas</td>
       <td><button class="btn secondary" onclick="viewRoleEmployee(${originalIndex})">View Full Information</button></td>
      </tr>`;
    }).join("")}
   </table>
  </div>
  ${users.length?"":"<p class='muted'>No employees are currently assigned to this role.</p>"}
 </div>

 <div id="roleEmployeeDetail"></div>`;
}

function viewRoleEmployee(index){
 const s=ensureStaffUsers();
 const u=s.staffUsers[index];
 if(!u)return;
 roleEmployeeDetail.innerHTML=`<div class="panel" style="margin-top:12px">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h2 style="margin:0">${u.name}</h2><p class="muted" style="margin:6px 0 0">${u.role}</p></div>
   <span class="badge ${u.status==="Active"?"green":"amber"}">${u.status}</span>
  </div>
  <div class="form" style="margin-top:16px">
   <div><b>First Name</b><p>${u.firstName||"—"}</p></div>
   <div><b>Middle Name</b><p>${u.middleName||"—"}</p></div>
   <div><b>Last Name</b><p>${u.lastName||"—"}</p></div>
   <div><b>Email</b><p>${u.email||"—"}</p></div>
   <div><b>Mobile</b><p>${u.phone||"—"}</p></div>
   <div><b>Current Address</b><p>${u.currentAddress||"—"}</p></div>
   <div><b>Current Post Code</b><p>${u.currentPostcode||"—"}</p></div>
   <div><b>Years at Current Address</b><p>${u.yearsAtCurrentAddress ?? "—"}</p></div>
   <div><b>Previous Address</b><p>${u.previousAddress||"—"}</p></div>
   <div><b>Previous Post Code</b><p>${u.previousPostcode||"—"}</p></div>
   <div><b>Emergency Contact Name</b><p>${u.emergencyName||"—"}</p></div>
   <div><b>Emergency Contact Number</b><p>${u.emergencyNumber||"—"}</p></div>
   <div><b>Emergency Contact Address</b><p>${u.emergencyAddress||"—"}</p></div>
   <div><b>Emergency Contact Post Code</b><p>${u.emergencyPostcode||"—"}</p></div>
   <div><b>Driving Licence Number</b><p>${u.drivingLicenceNo||"—"}</p></div>
   <div><b>Driving Licence Share Code</b><p>${u.drivingShareCode||"—"}</p></div>
   <div><b>Licence Type</b><p>${u.licenceType||"—"}</p></div>
   <div><b>Licence Country</b><p>${u.licenceCountry||"—"}</p></div>
   <div><b>Passport Number</b><p>${u.passportNo||"—"}</p></div>
   <div><b>Visa / Nationality Status</b><p>${u.visaType||"—"}</p></div>
   <div><b>Right to Work Share Code</b><p>${u.rightToWorkShareCode||"—"}</p></div>
   <div><b>Home Office Reference</b><p>${u.homeOfficeRef||"—"}</p></div>
   <div><b>Safety Certificate</b><p>${u.safetyCertificate||"—"}</p></div>
   <div><b>Allowed Portal Areas</b><p>${(u.permissions||[]).join(", ")||"—"}</p></div>
   <div><b>Created</b><p>${u.createdAt||"—"}</p></div>
   <div><b>Last Updated</b><p>${u.updatedAt||"—"}</p></div>
  </div>
  <div class="actions">
   <button class="btn primary" onclick="page='createUsers';render();setTimeout(()=>editUserInformation(${index}),50)">Edit Employee</button>
   <button class="btn secondary" onclick="document.getElementById('roleEmployeeDetail').innerHTML=''">Close</button>
  </div>
 </div>`;
 roleEmployeeDetail.scrollIntoView({behavior:"smooth"});
}

function drawCreateUsers(c){
 const s=ensureStaffUsers(),roles=userRoleList();
 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h2 style="margin:0">Create Users</h2><p class="muted" style="margin:6px 0 0">Add a complete employee or driver profile, assign designation and set account status.</p></div>
   <button class="btn secondary" onclick="page='users';render()">Back to Users</button>
  </div>
 </div>

 <div class="panel">
  <h3>Personal Details</h3>
  <div class="form">
   <input id="cuFirstName" placeholder="First Name *">
   <input id="cuMiddleName" placeholder="Middle Name">
   <input id="cuLastName" placeholder="Last Name *">
   <input id="cuEmail" type="email" placeholder="Email Address *">
   <input id="cuMobile" placeholder="Mobile Number *">
   <input id="cuAddress" placeholder="Current Address *">
   <input id="cuPostcode" placeholder="Current Post Code *">
   <input id="cuPresentYears" type="number" min="0" step="0.1" placeholder="Years at Present Address">
   <input id="cuPreviousAddress" class="full" placeholder="Previous Address (required if at current address for less than 5 years)">
   <input id="cuPreviousPostcode" placeholder="Previous Address Post Code">
  </div>
 </div>

 <div class="panel">
  <h3>Emergency Contact</h3>
  <div class="form">
   <input id="cuEmergencyName" placeholder="Emergency Contact Name *">
   <input id="cuEmergencyNumber" placeholder="Emergency Contact Number *">
   <input id="cuEmergencyAddress" placeholder="Emergency Contact Address">
   <input id="cuEmergencyPostcode" placeholder="Emergency Contact Post Code">
  </div>
 </div>

 <div class="panel">
  <h3>Driving Licence & DVLA</h3>
  <div class="form">
   <input id="cuDrivingLicenceNo" placeholder="Driving Licence Number *">
   <input id="cuDrivingShareCode" placeholder="Driving Licence Share Code">
   <select id="cuLicenceType" onchange="toggleInternationalCountry()">
    <option value="">Driving Licence Type *</option>
    <option>UK</option>
    <option>International</option>
   </select>
   <input id="cuLicenceCountry" placeholder="If International, which Country?" style="display:none">
   <label>DVLA Picture Upload<input id="cuDvlaPicture" type="file" accept="image/*,.pdf"></label>
  </div>
 </div>

 <div class="panel">
  <h3>Passport / Visa / Right to Work</h3>
  <div class="form">
   <input id="cuPassportNo" placeholder="Passport Number">
   <label>Passport Picture Upload<input id="cuPassportPicture" type="file" accept="image/*,.pdf"></label>
   <select id="cuVisaType" onchange="toggleVisaFields()">
    <option value="">Visa / Nationality Status *</option>
    <option>UK Passport Holder</option>
    <option>Non-British</option>
   </select>
   <label id="visaCardWrap" style="display:none">Visa Card Upload<input id="cuVisaCard" type="file" accept="image/*,.pdf"></label>
   <input id="cuRightToWorkShareCode" placeholder="Right to Work Share Code" style="display:none">
   <input id="cuHomeOfficeRef" placeholder="Home Office Reference / Visa Details" style="display:none">
  </div>
 </div>

 <div class="panel">
  <h3>UK On Wheels Driver Safety</h3>
  <div class="form">
   <input id="cuSafetyCertificate" placeholder="Driver Safety Certificate Number">
   <input id="cuDrivingLicenceExpiry" type="date" title="Driving Licence Expiry Date">
   <input id="cuDvlaExpiry" type="date" title="DVLA Check / Record Expiry Date">
   <input id="cuPassportExpiry" type="date" title="Passport Expiry Date">
   <input id="cuVisaExpiry" type="date" title="Visa Expiry Date">
   <input id="cuRightToWorkExpiry" type="date" title="Right to Work / Share Code Expiry Date">
   <input id="cuSafetyExpiry" type="date" title="Driver Safety Certificate Expiry Date">
   <select id="cuDesignation">
    <option value="">Select Designation *</option>
    ${roles.map(r=>`<option>${r}</option>`).join("")}
   </select>
   <select id="cuStatus">
    <option>Active</option>
    <option>Inactive</option>
   </select>
   <input id="cuTempPassword" type="password" placeholder="Temporary Password *">
  </div>
 </div>

 <div class="panel">
  <h3>Account Status</h3>
  <p class="muted">Use <b>Active</b> for current staff/drivers. If an employee or driver leaves UK On Wheels, change the account to <b>Inactive</b> so they can no longer use the portal.</p>
  <div class="actions"><button class="btn primary" onclick="createStaffUser()">Create User</button></div>
 </div>

 <div class="panel">
  <h3>Created Users</h3>
  <div class="scroll"><table style="min-width:1350px">
   <tr><th>Name</th><th>Email</th><th>Mobile</th><th>Designation</th><th>Licence</th><th>Visa Status</th><th>Status</th><th>Action</th></tr>
   ${s.staffUsers.map((u,i)=>`<tr>
    <td>${u.name}</td><td>${u.email}</td><td>${u.phone||"—"}</td><td>${u.role}</td>
    <td>${u.drivingLicenceNo||"—"}</td><td>${u.visaType||"—"}</td>
    <td><span class="badge ${u.status==="Active"?"green":"amber"}">${u.status}</span></td>
    <td>
      <button class="btn secondary" onclick="viewUserInformation(${i})">View Information</button>
      <button class="btn ${u.status==="Active"?"warn":"primary"}" onclick="toggleUserStatus(${i})">${u.status==="Active"?"Deactivate":"Activate"}</button>
    </td>
   </tr>`).join("")}
  </table></div>
 </div>
 <div id="userInformationArea"></div>`;
}

function viewUserInformation(index){
 const s=ensureStaffUsers();
 const u=s.staffUsers[index];
 if(!u)return;
 const box=document.getElementById("userInformationArea");
 if(!box)return;

 box.innerHTML=`<div class="panel" style="margin-top:12px">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div>
    <h2 style="margin:0">${u.name}</h2>
    <p class="muted" style="margin:6px 0 0">Full employee / driver profile</p>
   </div>
   <span class="badge ${u.status==="Active"?"green":"amber"}">${u.status}</span>
  </div>

  <div class="form" style="margin-top:16px">
   <div><b>First Name</b><p>${u.firstName||"—"}</p></div>
   <div><b>Middle Name</b><p>${u.middleName||"—"}</p></div>
   <div><b>Last Name</b><p>${u.lastName||"—"}</p></div>
   <div><b>Email Address</b><p>${u.email||"—"}</p></div>
   <div><b>Mobile Number</b><p>${u.phone||"—"}</p></div>
   <div><b>Designation</b><p>${u.role||"—"}</p></div>
   <div><b>Current Address</b><p>${u.currentAddress||"—"}</p></div>
   <div><b>Current Post Code</b><p>${u.currentPostcode||"—"}</p></div>
   <div><b>Years at Present Address</b><p>${u.yearsAtCurrentAddress ?? "—"}</p></div>
   <div><b>Previous Address</b><p>${u.previousAddress||"—"}</p></div>
   <div><b>Previous Post Code</b><p>${u.previousPostcode||"—"}</p></div>
   <div><b>Emergency Contact Name</b><p>${u.emergencyName||"—"}</p></div>
   <div><b>Emergency Contact Number</b><p>${u.emergencyNumber||"—"}</p></div>
   <div><b>Emergency Contact Address</b><p>${u.emergencyAddress||"—"}</p></div>
   <div><b>Emergency Contact Post Code</b><p>${u.emergencyPostcode||"—"}</p></div>
   <div><b>Driving Licence Number</b><p>${u.drivingLicenceNo||"—"}</p></div>
   <div><b>Driving Licence Share Code</b><p>${u.drivingShareCode||"—"}</p></div>
   <div><b>Driving Licence Type</b><p>${u.licenceType||"—"}</p></div>
   <div><b>Licence Country</b><p>${u.licenceCountry||"—"}</p></div>
   <div><b>Passport Number</b><p>${u.passportNo||"—"}</p></div>
   <div><b>Passport Picture</b><p>${u.passportPicture||"Not uploaded"}</p></div>
   <div><b>DVLA Picture</b><p>${u.dvlaPicture||"Not uploaded"}</p></div>
   <div><b>Visa / Nationality Status</b><p>${u.visaType||"—"}</p></div>
   <div><b>Visa Card</b><p>${u.visaCard||"Not uploaded"}</p></div>
   <div><b>Right to Work Share Code</b><p>${u.rightToWorkShareCode||"—"}</p></div>
   <div><b>Home Office Reference</b><p>${u.homeOfficeRef||"—"}</p></div>
   <div><b>UK On Wheels Driver Safety Certificate</b><p>${u.safetyCertificate||"—"}</p></div>
   <div><b>Account Status</b><p>${u.status||"—"}</p></div>
   <div><b>Created</b><p>${u.createdAt||"—"}</p></div>
  </div>

  <div class="actions">
   <button class="btn primary" onclick="editUserInformation(${index})">Edit / Change Information</button>
   <button class="btn secondary" onclick="document.getElementById('userInformationArea').innerHTML=''">Close</button>
  </div>
 </div>`;

 box.scrollIntoView({behavior:"smooth"});
}

function editUserInformation(index){
 const s=ensureStaffUsers();
 const u=s.staffUsers[index];
 if(!u)return;
 const roles=userRoleList();
 const box=document.getElementById("userInformationArea");
 if(!box)return;

 box.innerHTML=`<div class="panel" style="margin-top:12px">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h2 style="margin:0">Edit User Information</h2><p class="muted" style="margin:6px 0 0">${u.name}</p></div>
   <button class="btn secondary" onclick="viewUserInformation(${index})">Back to View</button>
  </div>

  <h3>Personal Details</h3>
  <div class="form">
   <input id="euFirstName" value="${u.firstName||""}" placeholder="First Name">
   <input id="euMiddleName" value="${u.middleName||""}" placeholder="Middle Name">
   <input id="euLastName" value="${u.lastName||""}" placeholder="Last Name">
   <input id="euEmail" type="email" value="${u.email||""}" placeholder="Email Address">
   <input id="euMobile" value="${u.phone||""}" placeholder="Mobile Number">
   <select id="euRole">${roles.map(r=>`<option ${r===u.role?"selected":""}>${r}</option>`).join("")}</select>
   <select id="euStatus"><option ${u.status==="Active"?"selected":""}>Active</option><option ${u.status==="Inactive"?"selected":""}>Inactive</option></select>
  </div>

  <h3>Address</h3>
  <div class="form">
   <input id="euAddress" value="${u.currentAddress||""}" placeholder="Current Address">
   <input id="euPostcode" value="${u.currentPostcode||""}" placeholder="Current Post Code">
   <input id="euYears" type="number" min="0" step="0.1" value="${u.yearsAtCurrentAddress ?? ""}" placeholder="Years at Present Address">
   <input id="euPreviousAddress" value="${u.previousAddress||""}" placeholder="Previous Address">
   <input id="euPreviousPostcode" value="${u.previousPostcode||""}" placeholder="Previous Post Code">
  </div>

  <h3>Emergency Contact</h3>
  <div class="form">
   <input id="euEmergencyName" value="${u.emergencyName||""}" placeholder="Emergency Contact Name">
   <input id="euEmergencyNumber" value="${u.emergencyNumber||""}" placeholder="Emergency Contact Number">
   <input id="euEmergencyAddress" value="${u.emergencyAddress||""}" placeholder="Emergency Contact Address">
   <input id="euEmergencyPostcode" value="${u.emergencyPostcode||""}" placeholder="Emergency Contact Post Code">
  </div>

  <h3>Licence / Passport / Visa</h3>
  <div class="form">
   <input id="euDrivingLicenceNo" value="${u.drivingLicenceNo||""}" placeholder="Driving Licence Number">
   <input id="euDrivingShareCode" value="${u.drivingShareCode||""}" placeholder="Driving Licence Share Code">
   <select id="euLicenceType"><option ${u.licenceType==="UK"?"selected":""}>UK</option><option ${u.licenceType==="International"?"selected":""}>International</option></select>
   <input id="euLicenceCountry" value="${u.licenceCountry||""}" placeholder="Licence Country">
   <input id="euPassportNo" value="${u.passportNo||""}" placeholder="Passport Number">
   <select id="euVisaType"><option ${u.visaType==="UK Passport Holder"?"selected":""}>UK Passport Holder</option><option ${u.visaType==="Non-British"?"selected":""}>Non-British</option></select>
   <input id="euRightToWorkShareCode" value="${u.rightToWorkShareCode||""}" placeholder="Right to Work Share Code">
   <input id="euHomeOfficeRef" value="${u.homeOfficeRef||""}" placeholder="Home Office Reference / Visa Details">
   <input id="euSafetyCertificate" value="${u.safetyCertificate||""}" placeholder="Driver Safety Certificate Number">
  </div>

  <h3>Replace Documents (Optional)</h3>
  <div class="form">
   <label>Passport Picture<input id="euPassportPicture" type="file" accept="image/*,.pdf"></label>
   <label>DVLA Picture<input id="euDvlaPicture" type="file" accept="image/*,.pdf"></label>
   <label>Visa Card<input id="euVisaCard" type="file" accept="image/*,.pdf"></label>
  </div>

  <div class="actions">
   <button class="btn primary" onclick="saveUserInformationChanges(${index})">Save Changes</button>
   <button class="btn secondary" onclick="viewUserInformation(${index})">Cancel</button>
  </div>
 </div>`;

 box.scrollIntoView({behavior:"smooth"});
}

function saveUserInformationChanges(index){
 let s=ensureStaffUsers();
 const u=s.staffUsers[index];
 if(!u)return;

 const first=document.getElementById("euFirstName").value.trim();
 const middle=document.getElementById("euMiddleName").value.trim();
 const last=document.getElementById("euLastName").value.trim();
 const email=document.getElementById("euEmail").value.trim();
 const phone=document.getElementById("euMobile").value.trim();
 if(!first||!last||!email)return alert("First Name, Last Name and Email Address are required.");

 const duplicate=s.staffUsers.some((x,i)=>i!==index && (x.email||"").toLowerCase()===email.toLowerCase());
 if(duplicate)return alert("Another user already uses this email address.");

 u.firstName=first;
 u.middleName=middle;
 u.lastName=last;
 u.name=[first,middle,last].filter(Boolean).join(" ");
 u.email=email;
 u.phone=phone;
 u.role=document.getElementById("euRole").value;
 u.status=document.getElementById("euStatus").value;
 u.currentAddress=document.getElementById("euAddress").value.trim();
 u.currentPostcode=document.getElementById("euPostcode").value.trim();
 u.yearsAtCurrentAddress=Number(document.getElementById("euYears").value||0);
 u.previousAddress=document.getElementById("euPreviousAddress").value.trim();
 u.previousPostcode=document.getElementById("euPreviousPostcode").value.trim();
 u.emergencyName=document.getElementById("euEmergencyName").value.trim();
 u.emergencyNumber=document.getElementById("euEmergencyNumber").value.trim();
 u.emergencyAddress=document.getElementById("euEmergencyAddress").value.trim();
 u.emergencyPostcode=document.getElementById("euEmergencyPostcode").value.trim();
 u.drivingLicenceNo=document.getElementById("euDrivingLicenceNo").value.trim();
 u.drivingShareCode=document.getElementById("euDrivingShareCode").value.trim();
 u.licenceType=document.getElementById("euLicenceType").value;
 u.licenceCountry=document.getElementById("euLicenceCountry").value.trim();
 u.passportNo=document.getElementById("euPassportNo").value.trim();
 u.visaType=document.getElementById("euVisaType").value;
 u.rightToWorkShareCode=document.getElementById("euRightToWorkShareCode").value.trim();
 u.homeOfficeRef=document.getElementById("euHomeOfficeRef").value.trim();
 u.safetyCertificate=document.getElementById("euSafetyCertificate").value.trim();

 const p=document.getElementById("euPassportPicture");
 const d=document.getElementById("euDvlaPicture");
 const v=document.getElementById("euVisaCard");
 if(p?.files?.length)u.passportPicture=p.files[0].name;
 if(d?.files?.length)u.dvlaPicture=d.files[0].name;
 if(v?.files?.length)u.visaCard=v.files[0].name;

 // Reset defaults only if the designation changed and current permissions are absent.
 if(!u.permissions || !u.permissions.length)u.permissions=defaultPermissionsForRole(u.role);

 u.updatedAt=new Date().toLocaleString();
 s.notifications.unshift({title:"User Information Updated",text:u.name+" profile details were updated."});
 saveStore(s);
 alert("User information updated successfully.");
 drawCreateUsers(document.getElementById("content"));
 setTimeout(()=>viewUserInformation(index),50);
}

function toggleVisaFields(){
 const nonBritish=document.getElementById("cuVisaType").value==="Non-British";
 document.getElementById("visaCardWrap").style.display=nonBritish?"block":"none";
 document.getElementById("cuRightToWorkShareCode").style.display=nonBritish?"block":"none";
 document.getElementById("cuHomeOfficeRef").style.display=nonBritish?"block":"none";
}

function toggleInternationalCountry(){
 const intl=document.getElementById("cuLicenceType").value==="International";
 document.getElementById("cuLicenceCountry").style.display=intl?"block":"none";
}

// Creates a real Supabase Auth login + profiles row for a newly created user,
// without disturbing the currently signed-in admin's session.
async function supabaseCreateLogin(email,password,profileFields){
 if(!SUPABASE_CONFIGURED)return true; // local-only demo mode: nothing to do
 try{
   const {data,error}=await sbAuthOnly.auth.signUp({email,password});
   if(error){alert("Account saved here, but the login could not be created: "+error.message);return false}
   const uid=data.user?.id;
   if(!uid){alert("Account saved. Note: Supabase has email confirmation ON — ask "+email+" to confirm their email before they can sign in, or turn confirmation off in Authentication settings for this prototype.");return true}
   const {error:pErr}=await sb.from("profiles").insert({id:uid,email,status:"Active",...profileFields});
   if(pErr){alert("Login created but the profile record failed to save: "+pErr.message);return false}
   return true;
 }catch(e){alert("Network error creating the login for "+email+".");return false}
}

async function createStaffUser(){
 let s=ensureStaffUsers();
 const first=document.getElementById("cuFirstName").value.trim();
 const middle=document.getElementById("cuMiddleName").value.trim();
 const last=document.getElementById("cuLastName").value.trim();
 const email=document.getElementById("cuEmail").value.trim();
 const mobile=document.getElementById("cuMobile").value.trim();
 const address=document.getElementById("cuAddress").value.trim();
 const postcode=document.getElementById("cuPostcode").value.trim();
 const years=Number(document.getElementById("cuPresentYears").value||0);
 const previousAddress=document.getElementById("cuPreviousAddress").value.trim();
 const previousPostcode=document.getElementById("cuPreviousPostcode").value.trim();
 const emergencyName=document.getElementById("cuEmergencyName").value.trim();
 const emergencyNumber=document.getElementById("cuEmergencyNumber").value.trim();
 const emergencyAddress=document.getElementById("cuEmergencyAddress").value.trim();
 const emergencyPostcode=document.getElementById("cuEmergencyPostcode").value.trim();
 const drivingLicenceNo=document.getElementById("cuDrivingLicenceNo").value.trim();
 const drivingShareCode=document.getElementById("cuDrivingShareCode").value.trim();
 const licenceType=document.getElementById("cuLicenceType").value;
 const licenceCountry=document.getElementById("cuLicenceCountry").value.trim();
 const passportNo=document.getElementById("cuPassportNo").value.trim();
 const visaType=document.getElementById("cuVisaType").value;
 const rightToWorkShareCode=document.getElementById("cuRightToWorkShareCode").value.trim();
 const homeOfficeRef=document.getElementById("cuHomeOfficeRef").value.trim();
 const safetyCertificate=document.getElementById("cuSafetyCertificate").value.trim();
 const drivingLicenceExpiry=document.getElementById("cuDrivingLicenceExpiry")?.value||"";
 const dvlaExpiry=document.getElementById("cuDvlaExpiry")?.value||"";
 const passportExpiry=document.getElementById("cuPassportExpiry")?.value||"";
 const visaExpiry=document.getElementById("cuVisaExpiry")?.value||"";
 const rightToWorkExpiry=document.getElementById("cuRightToWorkExpiry")?.value||"";
 const safetyExpiry=document.getElementById("cuSafetyExpiry")?.value||"";
 const role=document.getElementById("cuDesignation").value;
 const status=document.getElementById("cuStatus").value;
 const tempPassword=document.getElementById("cuTempPassword").value;

 if(!first||!last||!email||!mobile||!address||!postcode||!emergencyName||!emergencyNumber||!drivingLicenceNo||!licenceType||!visaType||!role||!tempPassword){
   return alert("Please complete all required fields marked with *.");
 }
 if(years<5 && !previousAddress){
   return alert("Previous address is required because the user has lived at the current address for less than 5 years.");
 }
 if(licenceType==="International" && !licenceCountry){
   return alert("Please enter the country for the international driving licence.");
 }
 if(visaType==="Non-British" && !rightToWorkShareCode){
   return alert("Please enter the Right to Work Share Code for a non-British user.");
 }
 if(s.staffUsers.some(u=>(u.email||"").toLowerCase()===email.toLowerCase())){
   return alert("A user with this email already exists.");
 }

 const fullName=[first,middle,last].filter(Boolean).join(" ");
 const passportPicture=document.getElementById("cuPassportPicture").files.length ? document.getElementById("cuPassportPicture").files[0].name : "";
 const dvlaPicture=document.getElementById("cuDvlaPicture").files.length ? document.getElementById("cuDvlaPicture").files[0].name : "";
 const visaCard=document.getElementById("cuVisaCard")?.files?.length ? document.getElementById("cuVisaCard").files[0].name : "";

 s.staffUsers.push({
  name:fullName,
  firstName:first,middleName:middle,lastName:last,
  email,phone:mobile,
  currentAddress:address,currentPostcode:postcode,yearsAtCurrentAddress:years,
  previousAddress,previousPostcode,
  emergencyName,emergencyNumber,emergencyAddress,emergencyPostcode,
  drivingLicenceNo,drivingShareCode,licenceType,licenceCountry,
  passportNo,passportPicture,dvlaPicture,
  visaType,visaCard,rightToWorkShareCode,homeOfficeRef,
  safetyCertificate,
  drivingLicenceExpiry,dvlaExpiry,passportExpiry,visaExpiry,rightToWorkExpiry,safetyExpiry,
  role,status,
  permissions:defaultPermissionsForRole(role),
  createdAt:new Date().toLocaleString()
 });

 s.notifications.unshift({title:"User Created",text:fullName+" created as "+role+" with status "+status+"."});
 saveStore(s);
 await supabaseCreateLogin(email,tempPassword,{name:fullName,role:"staff",staff_role:role,permissions:defaultPermissionsForRole(role)});
 alert("User created successfully.");
 drawCreateUsers(document.getElementById("content"));
}

function drawAssignUserRoles(c){
 const s=ensureStaffUsers();
 const perms=allPermissionOptions();
 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h2 style="margin:0">Assign User Roles</h2><p class="muted" style="margin:6px 0 0">Restrict each user so they only see the sections required for their job.</p></div>
   <button class="btn secondary" onclick="page='users';render()">Back to Users</button>
  </div>
 </div>

 ${s.staffUsers.map((u,i)=>`<div class="panel" style="margin-top:12px">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
    <div><h3 style="margin:0">${u.name}</h3><div class="muted">${u.email}</div></div>
    <span class="badge">${u.role}</span>
   </div>

   <div class="form" style="margin-top:14px">
    <select id="role_${i}" onchange="applyRoleDefaults(${i})">
      ${userRoleList().map(r=>`<option ${r===u.role?"selected":""}>${r}</option>`).join("")}
    </select>
    <select id="status_${i}">
      <option ${u.status==="Active"?"selected":""}>Active</option>
      <option ${u.status==="Inactive"?"selected":""}>Inactive</option>
    </select>
   </div>

   <h4>Allowed Portal Areas</h4>
   <div class="grid2">
    ${perms.map(([key,label])=>`<label class="step" style="margin:0"><input type="checkbox" id="perm_${i}_${key}" ${(u.permissions||[]).includes(key)?"checked":""}> ${label}</label>`).join("")}
   </div>

   <div style="margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:9px;background:#fff8e6">
    <b>Restricted access:</b> unticked sections should be hidden from this user in the production portal. They should not be able to open those pages directly either.
   </div>

   <div class="actions">
    <button class="btn primary" onclick="saveUserPermissions(${i})">Save Restricted Access</button>
   </div>
 </div>`).join("")}`;
}

function applyRoleDefaults(index){
 const role=document.getElementById("role_"+index).value;
 const defaults=defaultPermissionsForRole(role);
 allPermissionOptions().forEach(([key])=>{
   const el=document.getElementById(`perm_${index}_${key}`);
   if(el)el.checked=defaults.includes(key);
 });
}

function saveUserPermissions(index){
 let s=ensureStaffUsers(),u=s.staffUsers[index];
 const role=document.getElementById("role_"+index).value;
 const status=document.getElementById("status_"+index).value;
 const permissions=allPermissionOptions().filter(([key])=>document.getElementById(`perm_${index}_${key}`).checked).map(([key])=>key);
 if(role==="Super Admin" && permissions.length<allPermissionOptions().length){
   if(!confirm("Super Admin normally has full access. Save restricted access anyway?"))return;
 }
 u.role=role;u.status=status;u.permissions=permissions;
 s.notifications.unshift({title:"User Access Updated",text:u.name+" access updated for "+role+"."});
 saveStore(s);
 alert("Restricted access saved for "+u.name+".");
 drawAssignUserRoles(document.getElementById("content"));
}

function toggleUserStatus(index){
 let s=ensureStaffUsers();
 const u=s.staffUsers[index];
 if(!u)return;
 u.status=u.status==="Active"?"Inactive":"Active";
 s.notifications.unshift({title:"User Status Changed",text:u.name+" is now "+u.status+"."});
 saveStore(s);
 drawCreateUsers(document.getElementById("content"));
}

function drawQuickUpdate(c,field,title){
 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h2 style="margin:0">${title}</h2><p class="muted" style="margin:6px 0 0">Enter the Booking Reference manually and press Enter. Full booking details will appear before the update.</p></div>
   <button class="btn secondary" onclick="page='desktop';render()">Back to Dashboard</button>
  </div>
 </div>
 <div class="panel" style="margin-top:12px">
  <label><b>Booking Reference</b></label>
  <input id="manualBookingRef" placeholder="Example: BK00129" style="width:100%;padding:13px;border:1px solid var(--line);border-radius:8px;margin-top:7px;text-transform:uppercase">
  <div class="actions"><button class="btn primary" id="manualFindBtn">Find Booking</button></div>
 </div>
 <div id="manualUpdateResult"></div>`;
 const refEl=document.getElementById("manualBookingRef");
 const findBtn=document.getElementById("manualFindBtn");
 if(refEl)refEl.addEventListener("keydown",e=>{if(e.key==="Enter")lookupBookingForUpdate(field,title)});
 if(findBtn)findBtn.addEventListener("click",()=>lookupBookingForUpdate(field,title));
}

function lookupBookingForUpdate(field,title){
 const refEl=document.getElementById("manualBookingRef");
 const box=document.getElementById("manualUpdateResult");
 if(!refEl||!box)return alert("Update page could not initialise. Please reopen this section.");
 const ref=(refEl.value||"").trim().toUpperCase();
 if(!ref)return alert("Please enter a Booking Reference.");
 const s=getStore();
 const b=s.bookings.find(x=>String(x.ref||"").toUpperCase()===ref);
 if(!b){
  box.innerHTML=`<div class="panel" style="margin-top:12px;border-color:#f2b8b8"><h3>Booking Not Found</h3><p class="muted">No booking was found for <b>${ref}</b>.</p></div>`;
  return;
 }
 const currentValue=field==="miles"?(b.miles||0):field==="amount"?Number(b.amount||0).toFixed(2):(b.destination||"");
 const inputType=(field==="miles"||field==="amount")?"number":"text";
 const step=field==="amount"?'step="0.01"':"";
 const label=field==="miles"?"New Miles Travelled":field==="amount"?"New Amount (£)":"New Destination";
 box.innerHTML=`<div class="panel" style="margin-top:12px">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><h3 style="margin:0">${b.ref} — ${b.vehicle}</h3><div class="muted">${b.business||""}</div></div><span class="badge">${b.status}</span></div>
  <div class="scroll" style="margin-top:14px"><table style="min-width:1500px">
   <tr><th>Booking Ref</th><th>Business</th><th>Vehicle</th><th>Reg</th><th>Collection</th><th>Destination</th><th>Service</th><th>Miles</th><th>Booking Date</th><th>Delivery Date</th><th>Receiver</th><th>Mobile</th><th>Driver</th><th>Amount</th><th>Status</th></tr>
   <tr><td><b>${b.ref}</b></td><td>${b.customerType==="Private"?(b.privateCustomerName||"Private Customer"):(b.business||"—")}</td><td>${b.vehicle||"—"}</td><td>${b.reg||"—"}</td><td>${b.pickup||"—"}</td><td>${b.destination||"—"}</td><td>${b.service||"—"}</td><td>${b.miles||0}</td><td>${b.bookingDate||"—"}</td><td>${b.deliveryDate||"—"}</td><td>${b.receiver||"—"}</td><td>${b.receiverMobile||"—"}</td><td>${b.driver||"Not assigned"}</td><td>£${Number(b.amount||0).toFixed(2)}</td><td>${b.status}</td></tr>
  </table></div>
  <div style="margin-top:16px;padding:15px;border:1px solid var(--line);border-radius:10px;background:#f9fbfe">
   <h4 style="margin-top:0">${title}</h4>
   <div class="form"><div><label><b>Current Value</b></label><input value="${currentValue}" disabled></div><div><label><b>${label}</b></label><input id="manualNewValue" type="${inputType}" ${step} value="${currentValue}"></div></div>
   <div class="actions"><button class="btn primary" id="manualSaveBtn">Save Update</button><button class="btn secondary" id="manualCancelBtn">Cancel</button></div>
  </div></div>`;
 const saveBtn=document.getElementById("manualSaveBtn");
 const cancelBtn=document.getElementById("manualCancelBtn");
 if(saveBtn)saveBtn.addEventListener("click",()=>confirmManualUpdate(b.ref,field,title));
 if(cancelBtn)cancelBtn.addEventListener("click",()=>{box.innerHTML=""});
}

function confirmManualUpdate(ref,field,title){
 let s=getStore();
 const b=s.bookings.find(x=>x.ref===ref);
 const valEl=document.getElementById("manualNewValue");
 if(!b||!valEl)return alert("Booking update could not be completed.");
 const raw=valEl.value;
 if(raw==="")return alert("Please enter the new value.");
 const oldValue=field==="miles"?(b.miles||0):field==="amount"?(b.amount||0):(b.destination||"");
 const newValue=(field==="miles"||field==="amount")?Number(raw):raw.trim();
 if((field==="miles"||field==="amount")&&!Number.isFinite(newValue))return alert("Please enter a valid number.");
 if(!confirm(`Confirm ${title} for ${ref}?\n\nCurrent: ${oldValue}\nNew: ${newValue}`))return;
 b[field]=newValue;
 b.timeline=b.timeline||[];
 b.timeline.unshift({title,text:`${field} changed from "${oldValue}" to "${newValue}" at ${new Date().toLocaleString()}`});
 s.notifications=s.notifications||[];
 s.notifications.unshift({title,text:`${ref} ${field} updated.`});
 saveStore(s);
 alert(title+" completed successfully for "+ref+".");
 lookupBookingForUpdate(field,title);
}

function ensureInvoiceSettings(s){
 if(!s.invoiceSettings){
   s.invoiceSettings={
    companyName:"UK On Wheels Ltd",
    companyAddress:"Not set",
    companyPostcode:"Not set",
    companyEmail:"Not set",
    companyPhone:"Not set",
    vatNumber:"Not set",
    companyRegistration:"Not set",
    bankName:"Bank of Scotland",
    bankAccountName:"UK On Wheels Ltd",
    bankSortCode:"Not set",
    bankAccountNumber:"Not set",
    iban:"Not set",
    paymentTermsDays:30,
    latePaymentText:"If this invoice is not paid within 30 days, UK On Wheels Ltd reserves the right to charge contractual interest at 6% above the Bank of Scotland interest rate, where legally applicable."
   };
 }
 return s;
}

function ensureAccountsData(){
 let s=getStore(), changed=false;
 const hadSettings=!!s.invoiceSettings;
 s=ensureInvoiceSettings(s);
 if(!hadSettings)changed=true;
 if(!s.expenses){s.expenses=[];changed=true}
 if(!s.invoices){s.invoices=[];changed=true}
 if(!s.transactions){s.transactions=[];changed=true}
 if(changed)saveStore(s);
 return getStore();
}

function money(v){return "£"+Number(v||0).toFixed(2)}

function monthOf(d){return d?String(d).slice(0,7):""}

function drawAdminAccounts(c){
 const s=ensureAccountsData();
 const expenses=s.expenses.reduce((a,x)=>a+Number(x.amount||0),0);
 const cash=s.transactions.filter(x=>x.method==="Cash").reduce((a,x)=>a+Number(x.amount||0),0);
 const bank=s.transactions.filter(x=>x.method==="Bank Transfer").reduce((a,x)=>a+Number(x.amount||0),0);
 const pending=s.bookings.filter(b=>b.paymentStatus!=="Paid").length;
 c.innerHTML=`<div class="cards">
  <div class="card"><b>Total Expenses</b><strong>${money(expenses)}</strong></div>
  <div class="card"><b>Cash Received</b><strong>${money(cash)}</strong></div>
  <div class="card"><b>Bank Received</b><strong>${money(bank)}</strong></div>
  <div class="card"><b>Pending Payments</b><strong>${pending}</strong></div>
  <div class="card"><b>Invoices</b><strong>${s.invoices.length}</strong></div>
 </div><div class="panel"><h3>Accounts</h3><p class="muted">Use the Accounts menu for expenses, invoices, transactions, pending payments, reports and monthly P&L.</p></div>`;
}

function drawExpenses(c){
 const s=ensureAccountsData(), cats=["Fuel","Rent","Office","Entertainment","Utility Bills","Rider Fuel","Staff Fuel","Hotel Expense","Vehicle Recovery Expenses","Insurance","Other Expenses"];
 c.innerHTML=`<div class="panel"><h2>Add Expenses</h2><div class="form">
 <input id="exDate" type="date"><select id="exCat"><option value="">Expense Type *</option>${cats.map(x=>`<option>${x}</option>`).join("")}</select>
 <input id="exAmount" type="number" step="0.01" placeholder="Amount (£) *"><select id="exMethod"><option>Cash</option><option>Bank Transfer</option><option>Card</option></select>
 <input id="exRef" placeholder="Receipt / Reference"><input id="exPayee" placeholder="Supplier / Paid To"><textarea id="exNotes" class="full" placeholder="Notes"></textarea>
 </div><div class="actions"><button class="btn primary" onclick="saveExpense()">Add Expense</button></div></div>
 <div class="panel" style="margin-top:12px"><h3>Expense Register</h3><div class="scroll"><table style="min-width:1050px"><tr><th>Date</th><th>Category</th><th>Payee</th><th>Method</th><th>Reference</th><th>Amount</th><th>Notes</th></tr>
 ${s.expenses.slice().reverse().map(x=>`<tr><td>${x.date}</td><td>${x.category}</td><td>${x.payee||"—"}</td><td>${x.method}</td><td>${x.reference||"—"}</td><td>${money(x.amount)}</td><td>${x.notes||"—"}</td></tr>`).join("")}
 </table></div></div>`;
}

function saveExpense(){
 let s=ensureAccountsData();
 if(!exCat.value||!exAmount.value)return alert("Expense type and amount are required.");
 s.expenses.push({date:exDate.value||new Date().toISOString().slice(0,10),category:exCat.value,amount:Number(exAmount.value),method:exMethod.value,reference:exRef.value.trim(),payee:exPayee.value.trim(),notes:exNotes.value.trim()});
 saveStore(s);drawExpenses(document.getElementById("content"));
}

function drawInvoices(c){
 const s=ensureAccountsData(), cfg=s.invoiceSettings;
 c.innerHTML=`<div class="panel">
  <h2>Invoice Company & Bank Details</h2>
  <p class="muted">These details will appear on every invoice.</p>
  <div class="form">
   <input id="cfgCompanyName" value="${cfg.companyName||""}" placeholder="Company Name">
   <input id="cfgCompanyReg" value="${cfg.companyRegistration||""}" placeholder="Company Registration Number">
   <input id="cfgAddress" value="${cfg.companyAddress||""}" placeholder="Company Address">
   <input id="cfgPostcode" value="${cfg.companyPostcode||""}" placeholder="Company Post Code">
   <input id="cfgEmail" value="${cfg.companyEmail||""}" placeholder="Company Email">
   <input id="cfgPhone" value="${cfg.companyPhone||""}" placeholder="Company Phone">
   <input id="cfgVat" value="${cfg.vatNumber||""}" placeholder="VAT Number">
   <input id="cfgBankName" value="${cfg.bankName||""}" placeholder="Bank Name">
   <input id="cfgBankAccountName" value="${cfg.bankAccountName||""}" placeholder="Bank Account Name">
   <input id="cfgSortCode" value="${cfg.bankSortCode||""}" placeholder="Sort Code">
   <input id="cfgAccountNo" value="${cfg.bankAccountNumber||""}" placeholder="Account Number">
   <input id="cfgIban" value="${cfg.iban||""}" placeholder="IBAN (optional)">
   <textarea id="cfgLateTerms" class="full" placeholder="Late payment terms">${cfg.latePaymentText||""}</textarea>
  </div>
  <div class="actions"><button class="btn secondary" onclick="saveInvoiceSettings()">Save Company / Bank Details</button></div>
 </div>

 <div class="panel" style="margin-top:12px"><h2>Generate Invoice</h2><div class="form">
 <select id="invBiz"><option value="">Select Client *</option>${s.businesses.map(b=>`<option value="${b.name}">${b.name}</option>`).join("")}</select>
 <input id="invDate" type="date"><input id="invDue" type="date"><input id="invVat" type="number" step="0.01" value="20" placeholder="VAT %">
 <input id="invExtra" type="number" step="0.01" placeholder="Extra Phrasal (£)"><input id="invOther" type="number" step="0.01" placeholder="Other Charges (£)">
 <textarea id="invOtherDesc" class="full" placeholder="Other Charges Description"></textarea></div>
 <div class="actions"><button class="btn primary" id="loadInvoiceBtn">Load Delivered Vehicles</button></div><div id="invVehicleArea"></div></div>
 <div class="panel" style="margin-top:12px"><h3>Generated Invoices</h3><div class="scroll"><table style="min-width:1250px"><tr><th>Invoice</th><th>Client</th><th>Date</th><th>Vehicles</th><th>Subtotal</th><th>VAT</th><th>Extras</th><th>Total</th><th>Status</th><th>Payment Date</th><th>Action</th></tr>
 ${s.invoices.slice().reverse().map(i=>`<tr>
 <td><b>${i.invoiceNo}</b></td><td>${i.business}</td><td>${i.date}</td><td>${i.vehicleCount}</td>
 <td>${money(i.subtotal)}</td><td>${money(i.vatAmount)}</td><td>${money(i.extraTotal)}</td><td>${money(i.total)}</td>
 <td><span class="badge ${i.status==="Paid"?"green":"amber"}">${i.status}</span></td>
 <td>${i.paymentDate||"—"}</td>
 <td>
   <button class="btn secondary" onclick="viewInvoice('${i.invoiceNo}')">View Invoice</button>
   ${i.status!=="Paid"?`<button class="btn primary" onclick="openMarkInvoicePaid('${i.invoiceNo}')">Mark Paid</button>`:`<button class="btn secondary" onclick="reopenInvoice('${i.invoiceNo}')">Reopen</button>`}
 </td></tr>`).join("")}
 </table></div></div><div id="invoicePaymentArea"></div>`;
 const btn=document.getElementById("loadInvoiceBtn");
 if(btn)btn.addEventListener("click",loadInvoiceVehicles);
}

function saveInvoiceSettings(){
 let s=ensureAccountsData(),cfg=s.invoiceSettings;
 cfg.companyName=document.getElementById("cfgCompanyName").value.trim();
 cfg.companyRegistration=document.getElementById("cfgCompanyReg").value.trim();
 cfg.companyAddress=document.getElementById("cfgAddress").value.trim();
 cfg.companyPostcode=document.getElementById("cfgPostcode").value.trim();
 cfg.companyEmail=document.getElementById("cfgEmail").value.trim();
 cfg.companyPhone=document.getElementById("cfgPhone").value.trim();
 cfg.vatNumber=document.getElementById("cfgVat").value.trim();
 cfg.bankName=document.getElementById("cfgBankName").value.trim();
 cfg.bankAccountName=document.getElementById("cfgBankAccountName").value.trim();
 cfg.bankSortCode=document.getElementById("cfgSortCode").value.trim();
 cfg.bankAccountNumber=document.getElementById("cfgAccountNo").value.trim();
 cfg.iban=document.getElementById("cfgIban").value.trim();
 cfg.latePaymentText=document.getElementById("cfgLateTerms").value.trim();
 saveStore(s);
 alert("Invoice company and bank details saved.");
 drawInvoices(document.getElementById("content"));
}

function openMarkInvoicePaid(invoiceNo){
 const s=ensureAccountsData(),i=s.invoices.find(x=>x.invoiceNo===invoiceNo);
 if(!i)return alert("Invoice not found.");
 const box=document.getElementById("invoicePaymentArea");
 if(!box)return;
 box.innerHTML=`<div class="panel" style="margin-top:12px">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
    <div><h3 style="margin:0">Mark Invoice Paid</h3><p class="muted" style="margin:6px 0 0">${i.invoiceNo} · ${i.business} · ${money(i.total)}</p></div>
    <button class="btn secondary" onclick="document.getElementById('invoicePaymentArea').innerHTML=''">Close</button>
   </div>
   <div class="form" style="margin-top:14px">
    <input id="invoicePaidDate" type="date" value="${new Date().toISOString().slice(0,10)}">
    <select id="invoicePaidMethod">
      <option>Bank Transfer</option>
      <option>Cash</option>
      <option>Card</option>
      <option>Other</option>
    </select>
    <input id="invoicePaidRef" placeholder="Payment / Bank Reference Number">
    <input id="invoicePaidAmount" type="number" step="0.01" value="${Number(i.total||0).toFixed(2)}" placeholder="Amount Paid (£)">
   </div>
   <div class="actions"><button class="btn primary" onclick="markInvoicePaid('${i.invoiceNo}')">Confirm Paid</button></div>
  </div>`;
 box.scrollIntoView({behavior:"smooth"});
}

function markInvoicePaid(invoiceNo){
 let s=ensureAccountsData(),i=s.invoices.find(x=>x.invoiceNo===invoiceNo);
 if(!i)return alert("Invoice not found.");
 const dateEl=document.getElementById("invoicePaidDate");
 const methodEl=document.getElementById("invoicePaidMethod");
 const refEl=document.getElementById("invoicePaidRef");
 const amountEl=document.getElementById("invoicePaidAmount");
 const paymentDate=dateEl?.value;
 const paymentMethod=methodEl?.value||"Bank Transfer";
 const paymentRef=refEl?.value.trim()||"";
 const paidAmount=Number(amountEl?.value||0);
 if(!paymentDate)return alert("Please select the payment date.");
 if(!Number.isFinite(paidAmount)||paidAmount<=0)return alert("Please enter a valid amount paid.");
 if(paymentMethod==="Bank Transfer"&&!paymentRef)return alert("Please enter the bank/payment reference number.");

 i.status="Paid";
 i.paymentDate=paymentDate;
 i.paymentMethod=paymentMethod;
 i.paymentReference=paymentRef;
 i.paidAmount=paidAmount;
 i.paidAt=new Date().toLocaleString();

 (i.items||[]).forEach(it=>{
   const b=s.bookings.find(x=>x.ref===it.ref);
   if(b){
    b.paymentStatus="Paid";
    b.paymentMethod=paymentMethod;
    b.paidDate=paymentDate;
    b.paidAmount=it.charge;
    b.invoiceNo=invoiceNo;
   }
 });

 if(paymentMethod==="Cash"||paymentMethod==="Bank Transfer"){
  s.transactions.push({
   date:paymentDate,
   bookingRef:invoiceNo,
   business:i.business,
   method:paymentMethod,
   amount:paidAmount,
   bankReference:paymentMethod==="Bank Transfer"?paymentRef:"",
   status:"Cleared",
   type:"Invoice Payment"
  });
 }

 s.notifications.unshift({title:"Invoice Paid",text:`${invoiceNo} marked Paid on ${paymentDate}.`});
 saveStore(s);
 alert("Invoice marked Paid successfully.");
 drawInvoices(document.getElementById("content"));
}

function reopenInvoice(invoiceNo){
 let s=ensureAccountsData(),i=s.invoices.find(x=>x.invoiceNo===invoiceNo);
 if(!i)return;
 if(!confirm(`Reopen ${invoiceNo} and mark it Unpaid?`))return;
 i.status="Unpaid";
 i.paymentDate="";
 i.paymentMethod="";
 i.paymentReference="";
 i.paidAmount=0;
 (i.items||[]).forEach(it=>{
   const b=s.bookings.find(x=>x.ref===it.ref);
   if(b&&b.invoiceNo===invoiceNo)b.paymentStatus="Pending";
 });
 s.notifications.unshift({title:"Invoice Reopened",text:`${invoiceNo} changed back to Unpaid.`});
 saveStore(s);
 drawInvoices(document.getElementById("content"));
}

function loadInvoiceVehicles(){
 const s=ensureAccountsData();
 const bizEl=document.getElementById("invBiz");
 const area=document.getElementById("invVehicleArea");
 if(!bizEl||!area)return alert("Invoice page could not initialise.");
 const biz=bizEl.value;
 if(!biz)return alert("Select a client.");
 const rows=s.bookings.filter(b=>b.status==="Delivered"&&b.business===biz&&b.paymentStatus!=="Paid");
 if(!rows.length){
   area.innerHTML=`<div class="panel" style="margin-top:12px"><h3>No Delivered Vehicles Available</h3><p class="muted">There are no unpaid delivered vehicles for ${biz}. A vehicle must have status <b>Delivered</b> before it can be added to an invoice.</p></div>`;
   return;
 }
 area.innerHTML=`<div class="panel" style="margin-top:12px"><h3>Delivered Vehicles for ${biz}</h3><div class="scroll"><table style="min-width:1150px"><tr><th>Include</th><th>Booking</th><th>Vehicle</th><th>Reg</th><th>Delivered</th><th>Manual Charge (£)</th></tr>
 ${rows.map((b,i)=>`<tr><td><input id="ii_${i}" type="checkbox" checked></td><td>${b.ref}</td><td>${b.vehicle}</td><td>${b.reg||"—"}</td><td>${b.deliveryDate||"—"}</td><td><input id="ic_${i}" type="number" step="0.01" value="${Number(b.amount||0).toFixed(2)}"></td></tr>`).join("")}
 </table></div><div class="actions"><button class="btn primary" id="generateInvoiceBtn">Generate Invoice</button></div></div>`;
 const gen=document.getElementById("generateInvoiceBtn");
 if(gen)gen.addEventListener("click",()=>makeInvoice(rows.map(b=>b.ref)));
}

function makeInvoice(refs){
 let s=ensureAccountsData(),items=[],subtotal=0;
 refs.forEach((ref,i)=>{
   const include=document.getElementById("ii_"+i);
   const chargeEl=document.getElementById("ic_"+i);
   if(include&&include.checked&&chargeEl){
     const charge=Number(chargeEl.value||0),b=s.bookings.find(x=>x.ref===ref);
     if(b){items.push({ref,vehicle:b.vehicle,reg:b.reg||"",charge});subtotal+=charge;}
   }
 });
 if(!items.length)return alert("Select at least one delivered vehicle.");
 const bizEl=document.getElementById("invBiz"),dateEl=document.getElementById("invDate"),dueEl=document.getElementById("invDue"),vatEl=document.getElementById("invVat"),extraEl=document.getElementById("invExtra"),otherEl=document.getElementById("invOther"),descEl=document.getElementById("invOtherDesc");
 const vatPct=Number(vatEl?.value||0),vatAmount=subtotal*vatPct/100,extra=Number(extraEl?.value||0),other=Number(otherEl?.value||0),total=subtotal+vatAmount+extra+other;
 const invoiceNo="INV-"+String(Date.now()).slice(-7);
 s.invoices.push({invoiceNo,business:bizEl?.value||"",date:dateEl?.value||new Date().toISOString().slice(0,10),dueDate:dueEl?.value||"",vehicleCount:items.length,items,subtotal,vatPct,vatAmount,extraPhrasal:extra,otherCharges:other,otherDescription:descEl?.value.trim()||"",extraTotal:extra+other,total,status:"Unpaid"});
 items.forEach(it=>{const b=s.bookings.find(x=>x.ref===it.ref);if(b){b.paymentMethod="Invoice";b.paymentStatus="Pending";b.invoiceNo=invoiceNo;}});
 saveStore(s);
 alert(`Invoice ${invoiceNo} generated successfully for ${items.length} vehicle(s).`);
 drawInvoices(document.getElementById("content"));
}

function viewInvoice(invoiceNo){
 const s=ensureAccountsData(),i=s.invoices.find(x=>x.invoiceNo===invoiceNo),cfg=s.invoiceSettings;
 if(!i)return alert("Invoice not found.");
 const client=s.businesses.find(b=>b.name===i.business)||{name:i.business};
 const due=i.dueDate||"30 days from invoice date";
 page="invoiceView";
 render();
 const c=document.getElementById("content");
 c.innerHTML=`<div class="noPrint" style="margin-bottom:12px"><button class="btn secondary" onclick="page='invoices';render()">Back to Invoices</button> <button class="btn primary" onclick="window.print()">Print / Save PDF</button></div>
 <div class="invoiceSheet">
  <div class="invoiceHeader">
   <div>
    <div style="font-size:22px;font-weight:900">${cfg.companyName||"UK On Wheels Ltd"}</div>
    <div>${cfg.companyAddress||"Not set"}, ${cfg.companyPostcode||""}</div>
    <div>${cfg.companyEmail||"Not set"} · ${cfg.companyPhone||"Not set"}</div>
    <div><b>VAT No:</b> ${cfg.vatNumber||"Not set"}</div>
    <div><b>Company Reg:</b> ${cfg.companyRegistration||"Not set"}</div>
   </div>
   <div class="invoiceMeta">
    <div class="invoiceTitle">INVOICE</div>
    <div><b>Invoice No:</b> ${i.invoiceNo}</div>
    <div><b>Invoice Date:</b> ${i.date||"—"}</div>
    <div><b>Due Date:</b> ${due}</div>
   </div>
  </div>

  <div class="invoiceTwoCol">
   <div class="invoiceBox">
    <h3 style="margin-top:0">Bill To</h3>
    <div><b>${client.name||i.business}</b></div>
    <div>${client.address||"Address not set"}</div>
    <div>${client.postcode||""}</div>
    <div>${client.email||"Email not set"}</div>
    <div>${client.phone||"Phone not set"}</div>
    <div><b>VAT No:</b> ${client.vatNumber||"Not set"}</div>
    <div><b>Company Reg:</b> ${client.companyReg||"Not set"}</div>
   </div>
   <div class="invoiceBox">
    <h3 style="margin-top:0">Payment Terms</h3>
    <div><b>Please pay within 30 days.</b></div>
    <div>Payment status: ${i.status||"Unpaid"}</div>
    ${i.status==="Paid"?`<div><b>Payment Date:</b> ${i.paymentDate||"—"}</div><div><b>Payment Method:</b> ${i.paymentMethod||"—"}</div><div><b>Payment Reference:</b> ${i.paymentReference||"—"}</div>`:""}
   </div>
  </div>

  <div class="scroll">
   <table style="min-width:850px">
    <tr><th>Booking Ref</th><th>Vehicle</th><th>Reg No</th><th>Description</th><th>Charge</th></tr>
    ${(i.items||[]).map(it=>`<tr><td>${it.ref}</td><td>${it.vehicle||"Vehicle Delivery"}</td><td>${it.reg||"—"}</td><td>Vehicle collection and delivery service</td><td>${money(it.charge)}</td></tr>`).join("")}
   </table>
  </div>

  <div class="invoiceTotals">
   <table>
    <tr><td>Subtotal</td><td style="text-align:right">${money(i.subtotal)}</td></tr>
    <tr><td>VAT (${Number(i.vatPct||0).toFixed(2)}%)</td><td style="text-align:right">${money(i.vatAmount)}</td></tr>
    <tr><td>Extra Phrasal</td><td style="text-align:right">${money(i.extraPhrasal||0)}</td></tr>
    <tr><td>${i.otherDescription||"Other Charges"}</td><td style="text-align:right">${money(i.otherCharges||0)}</td></tr>
    <tr><td><b>Total Due</b></td><td style="text-align:right"><b>${money(i.total)}</b></td></tr>
   </table>
  </div>

  <div class="invoiceBank">
   <h3 style="margin-top:0">Bank Account Details</h3>
   <div><b>Bank:</b> ${cfg.bankName||"Not set"}</div>
   <div><b>Account Name:</b> ${cfg.bankAccountName||"Not set"}</div>
   <div><b>Sort Code:</b> ${cfg.bankSortCode||"Not set"}</div>
   <div><b>Account Number:</b> ${cfg.bankAccountNumber||"Not set"}</div>
   ${cfg.iban&&cfg.iban!=="Not set"?`<div><b>IBAN:</b> ${cfg.iban}</div>`:""}
  </div>

  <div class="invoiceTerms">
   <h3 style="margin-top:0">Terms & Conditions</h3>
   <p><b>Please pay this invoice within 30 days of the invoice date.</b></p>
   <p>${cfg.latePaymentText||""}</p>
   <p class="muted">Any contractual late-payment term is subject to applicable law and the terms agreed with the client.</p>
  </div>
 </div>`;
}

function drawPayments(c){
 const s=ensureAccountsData();
 c.innerHTML=`<div class="panel"><h2>Cash / Bank Transactions</h2><p class="muted">Enter Booking Reference and press Enter.</p>
 <input id="payRef" placeholder="Booking Reference" style="width:100%;padding:13px;border:1px solid var(--line);border-radius:8px;text-transform:uppercase" onkeydown="if(event.key==='Enter')findPaymentBooking()">
 <div class="actions"><button class="btn primary" onclick="findPaymentBooking()">Find Booking</button></div></div><div id="payResult"></div>
 <div class="panel" style="margin-top:12px"><h3>Transaction Register</h3><div class="scroll"><table style="min-width:1050px"><tr><th>Date</th><th>Booking</th><th>Business</th><th>Method</th><th>Amount</th><th>Bank Ref</th><th>Status</th></tr>
 ${s.transactions.slice().reverse().map(t=>`<tr><td>${t.date}</td><td>${t.bookingRef}</td><td>${t.business}</td><td>${t.method}</td><td>${money(t.amount)}</td><td>${t.bankReference||"—"}</td><td>${t.status}</td></tr>`).join("")}
 </table></div></div>`;
}

function findPaymentBooking(){
 const s=ensureAccountsData(), ref=payRef.value.trim().toUpperCase(), b=s.bookings.find(x=>x.ref===ref);
 if(!b){payResult.innerHTML=`<div class="panel" style="margin-top:12px">Booking not found.</div>`;return}
 payResult.innerHTML=`<div class="panel" style="margin-top:12px"><h3>${b.ref} — ${b.vehicle}</h3><div class="scroll"><table style="min-width:900px"><tr><th>Business</th><th>Reg</th><th>Status</th><th>Amount</th><th>Current Payment</th></tr><tr><td>${b.business}</td><td>${b.reg}</td><td>${b.status}</td><td>${money(b.amount)}</td><td>${b.paymentStatus||"Pending"} / ${b.paymentMethod||"Not Set"}</td></tr></table></div>
 <div class="form" style="margin-top:12px"><select id="pMethod" onchange="document.getElementById('pBankRef').style.display=this.value==='Bank Transfer'?'block':'none'"><option>Cash</option><option>Bank Transfer</option><option>Invoice</option></select>
 <input id="pAmount" type="number" step="0.01" value="${Number(b.amount||0).toFixed(2)}"><input id="pBankRef" placeholder="Bank Reference Number" style="display:none"><input id="pDate" type="date"></div>
 <div class="actions"><button class="btn primary" onclick="savePayment('${b.ref}')">Save Payment Method</button></div></div>`;
}

function savePayment(ref){
 let s=ensureAccountsData(),b=s.bookings.find(x=>x.ref===ref),method=pMethod.value,amount=Number(pAmount.value||0);
 if(method==="Bank Transfer"&&!pBankRef.value.trim())return alert("Bank reference number is required.");
 if(method==="Invoice"){b.paymentMethod="Invoice";b.paymentStatus="Pending";}
 else{b.paymentMethod=method;b.paymentStatus="Paid";b.paidAmount=amount;b.paidDate=pDate.value||new Date().toISOString().slice(0,10);s.transactions.push({date:b.paidDate,bookingRef:b.ref,business:b.business,method,amount,bankReference:method==="Bank Transfer"?pBankRef.value.trim():"",status:"Cleared"});}
 saveStore(s);drawPayments(document.getElementById("content"));
}

function drawPendingPayments(c){
 const s=ensureAccountsData(), rows=s.bookings.filter(b=>b.paymentStatus!=="Paid");
 c.innerHTML=`<div class="panel"><h2>Pending Payments</h2><div class="scroll"><table style="min-width:1100px"><tr><th>Booking</th><th>Business</th><th>Vehicle</th><th>Amount</th><th>Method</th><th>Invoice</th><th>Status</th></tr>
 ${rows.map(b=>`<tr><td>${b.ref}</td><td>${b.business}</td><td>${b.vehicle}</td><td>${money(b.amount)}</td><td>${b.paymentMethod||"Not Set"}</td><td>${b.invoiceNo||"—"}</td><td><span class="badge amber">${b.paymentStatus||"Pending"}</span></td></tr>`).join("")}
 </table></div></div>`;
}

function drawAccountReports(c){
 c.innerHTML=`<div class="panel"><h2>Accounts Reports</h2><div class="form"><input id="rFrom" type="date"><input id="rTo" type="date"><select id="rType"><option>Cash Report</option><option>Delivered Vehicle Report</option><option>Bank Receipt Report</option><option>Pending Payment Report</option></select></div>
 <div class="actions"><button class="btn primary" onclick="runReport()">Run Report</button></div></div><div id="rResult"></div>`;
}

function between(d,f,t){if(!d)return true; if(f&&d<f)return false; if(t&&d>t)return false; return true}

function runReport(){
 const s=ensureAccountsData(),type=rType.value,f=rFrom.value,t=rTo.value; let out="";
 if(type==="Cash Report"){const rows=s.transactions.filter(x=>x.method==="Cash"&&between(x.date,f,t));out=`<div class="panel" style="margin-top:12px"><h3>Cash Report</h3><table><tr><th>Date</th><th>Booking</th><th>Business</th><th>Amount</th></tr>${rows.map(x=>`<tr><td>${x.date}</td><td>${x.bookingRef}</td><td>${x.business}</td><td>${money(x.amount)}</td></tr>`).join("")}</table><p><b>Total ${money(rows.reduce((a,x)=>a+Number(x.amount||0),0))}</b></p></div>`}
 else if(type==="Bank Receipt Report"){const rows=s.transactions.filter(x=>x.method==="Bank Transfer"&&between(x.date,f,t));out=`<div class="panel" style="margin-top:12px"><h3>Bank Receipt Report</h3><table><tr><th>Date</th><th>Booking</th><th>Business</th><th>Bank Ref</th><th>Amount</th></tr>${rows.map(x=>`<tr><td>${x.date}</td><td>${x.bookingRef}</td><td>${x.business}</td><td>${x.bankReference||"—"}</td><td>${money(x.amount)}</td></tr>`).join("")}</table></div>`}
 else if(type==="Delivered Vehicle Report"){const rows=s.bookings.filter(b=>b.status==="Delivered"&&between(b.deliveryDate||"",f,t));out=`<div class="panel" style="margin-top:12px"><h3>Delivered Vehicle Report</h3><table><tr><th>Booking</th><th>Business</th><th>Vehicle</th><th>Delivery Date</th><th>Amount</th><th>Payment</th></tr>${rows.map(b=>`<tr><td>${b.ref}</td><td>${b.business}</td><td>${b.vehicle}</td><td>${b.deliveryDate||"—"}</td><td>${money(b.amount)}</td><td>${b.paymentStatus||"Pending"} / ${b.paymentMethod||"Not Set"}</td></tr>`).join("")}</table></div>`}
 else{const rows=s.bookings.filter(b=>b.paymentStatus!=="Paid"&&between(b.deliveryDate||b.bookingDate||"",f,t));out=`<div class="panel" style="margin-top:12px"><h3>Pending Payment Report</h3><table><tr><th>Booking</th><th>Business</th><th>Amount</th><th>Method</th><th>Status</th></tr>${rows.map(b=>`<tr><td>${b.ref}</td><td>${b.business}</td><td>${money(b.amount)}</td><td>${b.paymentMethod||"Not Set"}</td><td>Pending</td></tr>`).join("")}</table></div>`}
 rResult.innerHTML=out;
}

function drawProfitLoss(c){
 c.innerHTML=`<div class="panel"><h2>Monthly Profit & Loss</h2><div class="form"><input id="plMonth" type="month" value="${new Date().toISOString().slice(0,7)}"></div><div class="actions"><button class="btn primary" onclick="runPL()">Calculate Monthly P&L</button></div></div><div id="plResult"></div>`;
}

function runPL(){
 const s=ensureAccountsData(),m=plMonth.value;
 const income=s.transactions.filter(x=>monthOf(x.date)===m).reduce((a,x)=>a+Number(x.amount||0),0)+s.invoices.filter(i=>i.status==="Paid"&&monthOf(i.date)===m).reduce((a,i)=>a+Number(i.total||0),0);
 const expenses=s.expenses.filter(x=>monthOf(x.date)===m).reduce((a,x)=>a+Number(x.amount||0),0),net=income-expenses;
 plResult.innerHTML=`<div class="cards" style="margin-top:12px"><div class="card"><b>Total Income</b><strong>${money(income)}</strong></div><div class="card"><b>Total Expenses</b><strong>${money(expenses)}</strong></div><div class="card"><b>Net ${net>=0?"Profit":"Loss"}</b><strong>${money(net)}</strong></div></div>`;
}

function ensureHRData(){
 let s=getStore(),changed=false;
 if(!s.holidays){s.holidays=[];changed=true}
 if(!s.payslips){s.payslips=[];changed=true}
 if(!s.expiryAlertKeys){s.expiryAlertKeys=[];changed=true}
 if(changed)localStorage.setItem(KEY,JSON.stringify(s));
 return getStore();
}

function daysUntil(dateStr){
 if(!dateStr)return null;
 const today=new Date();today.setHours(0,0,0,0);
 const d=new Date(dateStr+"T00:00:00");
 if(isNaN(d))return null;
 return Math.ceil((d-today)/86400000);
}

function checkDocumentExpiries(){
 let s=ensureHRData(),changed=false;
 const fields=[
  ["drivingLicenceExpiry","Driving Licence"],["dvlaExpiry","DVLA Record"],["passportExpiry","Passport"],
  ["visaExpiry","Visa"],["rightToWorkExpiry","Right to Work / Share Code"],["safetyExpiry","Driver Safety Certificate"]
 ];
 (s.staffUsers||[]).forEach(u=>{
  fields.forEach(([key,label])=>{
   const d=u[key],days=daysUntil(d);if(days===null)return;
   const type=days<0?"expired":days<=30?"expiring":"";
   if(!type)return;
   const k=`${u.email}|${key}|${d}|${type}`;
   if((s.expiryAlertKeys||[]).includes(k))return;
   s.expiryAlertKeys.push(k);
   s.notifications=s.notifications||[];
   s.notifications.unshift({
    title:type==="expired"?"Document Expired":"Document Expiring Soon",
    text:`${u.name}: ${label} ${type==="expired"?"expired":"expires"} on ${d}. Please update the record.`
   });
   changed=true;
  });
 });
 if(changed)localStorage.setItem(KEY,JSON.stringify(s));
}

function drawHR(c){
 checkDocumentExpiries();
 const s=ensureHRData();
 const nonResidents=(s.staffUsers||[]).filter(u=>u.visaType==="Non-British").length;
 const shareCodes=(s.staffUsers||[]).filter(u=>u.drivingShareCode||u.rightToWorkShareCode).length;
 const pending=s.holidays.filter(h=>h.status==="Pending").length;
 c.innerHTML=`<div class="panel"><h2>HR</h2><p class="muted">Employee records, holidays, payslips, right-to-work, share codes and DVLA compliance.</p></div>
 <div class="cards" style="margin-top:12px">
  <div class="card" style="cursor:pointer" onclick="page='hrRegister';render()"><b>Employee Registration</b><strong>＋</strong><small>Same form as Create Users</small></div>
  <div class="card" style="cursor:pointer" onclick="page='hrHolidays';render()"><b>Holidays</b><strong>${pending}</strong><small>Pending requests</small></div>
  <div class="card" style="cursor:pointer" onclick="page='hrPayslips';render()"><b>Payslips</b><strong>${s.payslips.length}</strong><small>Generated</small></div>
  <div class="card" style="cursor:pointer" onclick="page='hrNonResidents';render()"><b>Non-Resident Records</b><strong>${nonResidents}</strong><small>Non-British staff</small></div>
  <div class="card" style="cursor:pointer" onclick="page='hrShareCodes';render()"><b>Share Codes</b><strong>${shareCodes}</strong><small>Employee codes</small></div>
  <div class="card" style="cursor:pointer" onclick="page='hrDvla';render()"><b>DVLA Records</b><strong>${(s.staffUsers||[]).length}</strong><small>Expiry tracking</small></div>
 </div>`;
}

function drawEmployeeRegistration(c){
 drawCreateUsers(c);
 const h=c.querySelector("h2");if(h)h.textContent="Employee Registration";
}

function drawHRHolidays(c){
 const s=ensureHRData();
 const users=(s.staffUsers||[]).slice().sort((a,b)=>(a.name||"").localeCompare(b.name||""));
 const driverRequests=(s.holidays||[]).filter(h=>h.requestedBy===h.name && h.role==="Driver").slice().reverse();
 const allRecords=(s.holidays||[]).slice().reverse();

 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div>
    <h2 style="margin:0">Holidays</h2>
    <p class="muted" style="margin:6px 0 0">HR can book holidays for any employee. All Driver App holiday requests appear here for approval or rejection.</p>
   </div>
   <span class="badge">${driverRequests.filter(h=>h.status==="Pending").length} driver requests pending</span>
  </div>
 </div>

 <div class="panel" style="margin-top:12px">
  <h3>Book Holiday for Employee / Driver</h3>
  <div class="form">
   <select id="holUser">
    <option value="">Select Employee / Driver *</option>
    ${users.map(u=>`<option value="${u.email}">${u.name} — ${u.role} — ${u.status||"Active"}</option>`).join("")}
   </select>
   <input id="holFrom" type="date">
   <input id="holTo" type="date">
   <select id="holType"><option>Annual Leave</option><option>Unpaid Leave</option><option>Emergency Leave</option><option>Other</option></select>
   <textarea id="holNotes" class="full" placeholder="Holiday notes"></textarea>
  </div>
  <div class="actions"><button class="btn primary" onclick="bookHolidayByHR()">Book Holiday</button></div>
 </div>

 <div class="panel" style="margin-top:12px">
  <h3>Driver Holiday Requests</h3>
  <p class="muted">Requests submitted from the Driver App appear here automatically.</p>
  <div class="scroll">
   <table style="min-width:1350px">
    <tr><th>Driver</th><th>Email</th><th>From</th><th>To</th><th>Type</th><th>Notes</th><th>Requested At</th><th>Status</th><th>HR Action</th></tr>
    ${driverRequests.map(h=>`<tr>
      <td><b>${h.name}</b></td>
      <td>${h.email||"—"}</td>
      <td>${h.from}</td>
      <td>${h.to}</td>
      <td>${h.type}</td>
      <td>${h.notes||"—"}</td>
      <td>${h.requestedAt||"—"}</td>
      <td><span class="badge ${h.status==="Approved"?"green":h.status==="Rejected"?"red":"amber"}">${h.status}</span></td>
      <td>${h.status==="Pending"
        ? `<button class="btn primary" onclick="setHolidayStatus('${h.id}','Approved')">Approve</button>
           <button class="btn danger" onclick="setHolidayStatus('${h.id}','Rejected')">Reject</button>`
        : `<span class="muted">${h.approvedBy||"HR"} ${h.approvedAt?"· "+h.approvedAt:""}</span>`}
      </td>
    </tr>`).join("")}
   </table>
  </div>
  ${driverRequests.length?"":"<p class='muted'>No driver holiday requests yet.</p>"}
 </div>

 <div class="panel" style="margin-top:12px">
  <h3>All Holiday Records</h3>
  <div class="scroll">
   <table style="min-width:1250px">
    <tr><th>Employee</th><th>Role</th><th>From</th><th>To</th><th>Type</th><th>Requested By</th><th>Status</th><th>Approved / Rejected By</th></tr>
    ${allRecords.map(h=>`<tr>
      <td>${h.name}</td>
      <td>${h.role||"—"}</td>
      <td>${h.from}</td>
      <td>${h.to}</td>
      <td>${h.type}</td>
      <td>${h.requestedBy||"—"}</td>
      <td><span class="badge ${h.status==="Approved"?"green":h.status==="Rejected"?"red":"amber"}">${h.status}</span></td>
      <td>${h.approvedBy||"—"} ${h.approvedAt?"· "+h.approvedAt:""}</td>
    </tr>`).join("")}
   </table>
  </div>
 </div>`;
}

function bookHolidayByHR(){
 let s=ensureHRData();
 const email=document.getElementById("holUser").value;
 const u=(s.staffUsers||[]).find(x=>x.email===email);
 const from=document.getElementById("holFrom").value;
 const to=document.getElementById("holTo").value;

 if(!u||!from||!to)return alert("Select an employee and holiday dates.");
 if(u.status==="Inactive")return alert("This employee account is inactive. Reactivate the employee before booking holiday.");
 if(to<from)return alert("Holiday end date cannot be before start date.");

 const now=new Date().toLocaleString();
 s.holidays.push({
   id:"HOL-"+Date.now(),
   email:u.email,
   name:u.name,
   role:u.role,
   from,
   to,
   type:document.getElementById("holType").value,
   notes:document.getElementById("holNotes").value.trim(),
   requestedBy:currentUser?.name||currentStaffUser?.name||"HR",
   requestedAt:now,
   status:"Approved",
   approvedBy:currentUser?.name||currentStaffUser?.name||"HR",
   approvedAt:now
 });

 s.notifications.unshift({
   title:"Holiday Booked",
   text:`${u.name} holiday booked ${from} to ${to}.`
 });

 s.notifications.unshift({
   title:"Operations Manager — Approved Holiday",
   text:`Holiday booked for ${u.name} (${u.role}) from ${from} to ${to}.`,
   targetRole:"Operations Manager",
   employeeName:u.name,
   createdAt:now
 });

 saveStore(s);
 alert("Holiday booked. Operations Manager has been notified.");
 drawHRHolidays(document.getElementById("content"));
}

function setHolidayStatus(id,status){
 let s=ensureHRData(),h=s.holidays.find(x=>x.id===id);
 if(!h)return;

 const actionBy=currentUser?.name||currentStaffUser?.name||"HR";
 const actionAt=new Date().toLocaleString();

 h.status=status;
 h.approvedBy=actionBy;
 h.approvedAt=actionAt;

 s.notifications=s.notifications||[];
 s.notifications.unshift({
   title:"Holiday "+status,
   text:`${h.name}: ${h.from} to ${h.to}. ${status} by ${actionBy}.`
 });

 if(status==="Approved"){
   s.notifications.unshift({
     title:"Operations Manager — Approved Holiday",
     text:`Holiday approved for ${h.name} (${h.role||"Driver"}) from ${h.from} to ${h.to}. Approved by ${actionBy}.`,
     targetRole:"Operations Manager",
     employeeName:h.name,
     holidayId:h.id,
     createdAt:actionAt
   });
 }

 saveStore(s);
 alert(status==="Approved"
   ? "Holiday approved. Operations Manager has been notified."
   : "Holiday request rejected.");
 drawHRHolidays(document.getElementById("content"));
}

function submitDriverHolidayRequest(){
 let s=ensureHRData(),name=currentUser?.name||"Driver";
 const u=(s.staffUsers||[]).find(x=>x.name===name);
 const from=document.getElementById("drvHolFrom")?.value,to=document.getElementById("drvHolTo")?.value;
 if(!from||!to)return alert("Please select holiday dates.");
 if(to<from)return alert("End date cannot be before start date.");
 s.holidays.push({id:"HOL-"+Date.now(),email:u?.email||"",name,role:"Driver",from,to,type:document.getElementById("drvHolType")?.value||"Annual Leave",notes:document.getElementById("drvHolNotes")?.value.trim()||"",requestedBy:name,requestedAt:new Date().toLocaleString(),status:"Pending"});
 s.notifications.unshift({title:"Holiday Request",text:`${name} requested holiday ${from} to ${to}.`});
 saveStore(s);alert("Holiday request sent to HR.");drawDriver(document.getElementById("content"));
}

function deliveredCountForEmployee(name,month){
 return getStore().bookings.filter(b=>b.status==="Delivered"&&b.driver===name&&String(b.deliveryDate||"").slice(0,7)===month).length;
}

function drawHRPayslips(c){
 const s=ensureHRData(),users=s.staffUsers||[];
 c.innerHTML=`<div class="panel"><h2>Payslips</h2><p class="muted">Shows delivered vehicles, pay due, tax and net pay.</p>
 <div class="form">
  <select id="psUser" onchange="refreshPayslipEstimate()"><option value="">Select Employee / Driver *</option>${users.map(u=>`<option value="${u.email}">${u.name} — ${u.role}</option>`).join("")}</select>
  <input id="psMonth" type="month" value="${new Date().toISOString().slice(0,7)}" onchange="refreshPayslipEstimate()">
  <input id="psRate" type="number" step="0.01" placeholder="Pay Per Delivered Vehicle (£)" oninput="refreshPayslipEstimate()">
  <input id="psBasic" type="number" step="0.01" placeholder="Basic / Other Gross Pay (£)" oninput="refreshPayslipEstimate()">
  <input id="psTax" type="number" step="0.01" value="20" placeholder="Tax %" oninput="refreshPayslipEstimate()">
 </div><div id="payslipEstimate" class="panel" style="margin-top:12px"></div>
 <div class="actions"><button class="btn primary" onclick="generatePayslip()">Generate Payslip</button></div></div>
 <div class="panel" style="margin-top:12px"><h3>Generated Payslips</h3><div class="scroll"><table style="min-width:1150px"><tr><th>Employee</th><th>Month</th><th>Vehicles Delivered</th><th>Rate</th><th>Gross</th><th>Tax</th><th>Net Pay</th></tr>
 ${s.payslips.slice().reverse().map(p=>`<tr><td>${p.name}</td><td>${p.month}</td><td>${p.deliveredCount}</td><td>£${Number(p.rate||0).toFixed(2)}</td><td>£${Number(p.gross||0).toFixed(2)}</td><td>£${Number(p.taxAmount||0).toFixed(2)}</td><td><b>£${Number(p.net||0).toFixed(2)}</b></td></tr>`).join("")}
 </table></div></div>`;
 refreshPayslipEstimate();
}

function refreshPayslipEstimate(){
 const s=ensureHRData(),email=document.getElementById("psUser")?.value,u=(s.staffUsers||[]).find(x=>x.email===email);
 const month=document.getElementById("psMonth")?.value||"",rate=Number(document.getElementById("psRate")?.value||0),basic=Number(document.getElementById("psBasic")?.value||0),taxPct=Number(document.getElementById("psTax")?.value||0);
 const delivered=u?deliveredCountForEmployee(u.name,month):0,gross=basic+delivered*rate,taxAmount=gross*taxPct/100,net=gross-taxAmount;
 const box=document.getElementById("payslipEstimate");if(box)box.innerHTML=`<b>Vehicles Delivered:</b> ${delivered} &nbsp; | &nbsp; <b>Gross:</b> £${gross.toFixed(2)} &nbsp; | &nbsp; <b>Tax:</b> £${taxAmount.toFixed(2)} &nbsp; | &nbsp; <b>Net Pay:</b> £${net.toFixed(2)}`;
}

function generatePayslip(){
 let s=ensureHRData(),email=document.getElementById("psUser").value,u=(s.staffUsers||[]).find(x=>x.email===email),month=document.getElementById("psMonth").value;
 if(!u||!month)return alert("Select employee and month.");
 const rate=Number(document.getElementById("psRate").value||0),basic=Number(document.getElementById("psBasic").value||0),taxPct=Number(document.getElementById("psTax").value||0),delivered=deliveredCountForEmployee(u.name,month),gross=basic+delivered*rate,taxAmount=gross*taxPct/100,net=gross-taxAmount;
 s.payslips.push({id:"PAY-"+Date.now(),email:u.email,name:u.name,role:u.role,month,deliveredCount:delivered,rate,basic,gross,taxPct,taxAmount,net,createdAt:new Date().toLocaleString()});
 saveStore(s);drawHRPayslips(document.getElementById("content"));
}

function drawNonResidentRecords(c){
 const s=ensureHRData(),rows=(s.staffUsers||[]).filter(u=>u.visaType==="Non-British");
 c.innerHTML=`<div class="panel"><h2>Non-Resident Records</h2><div class="scroll"><table style="min-width:1500px"><tr><th>Name</th><th>Role</th><th>Email</th><th>Mobile</th><th>Address</th><th>Passport</th><th>Visa Status</th><th>Visa Expiry</th><th>Right to Work Code</th><th>RTW Expiry</th><th>Home Office Ref</th><th>Status</th></tr>
 ${rows.map(u=>`<tr><td><b>${u.name}</b></td><td>${u.role}</td><td>${u.email}</td><td>${u.phone||"—"}</td><td>${u.currentAddress||"—"} ${u.currentPostcode||""}</td><td>${u.passportNo||"—"}</td><td>${u.visaType}</td><td>${u.visaExpiry||"—"}</td><td>${u.rightToWorkShareCode||"—"}</td><td>${u.rightToWorkExpiry||"—"}</td><td>${u.homeOfficeRef||"—"}</td><td>${u.status}</td></tr>`).join("")}
 </table></div>${rows.length?"":"<p class='muted'>No non-British employee records.</p>"}</div>`;
}

function drawShareCodeRecords(c){
 const s=ensureHRData(),rows=(s.staffUsers||[]).filter(u=>u.drivingShareCode||u.rightToWorkShareCode);
 c.innerHTML=`<div class="panel"><h2>Share Code Records</h2><div class="scroll"><table style="min-width:1550px"><tr><th>Name</th><th>Role</th><th>Email</th><th>Mobile</th><th>Address</th><th>Driving Licence</th><th>DVLA Share Code</th><th>Right to Work Share Code</th><th>RTW Expiry</th><th>Visa</th><th>Status</th></tr>
 ${rows.map(u=>`<tr><td><b>${u.name}</b></td><td>${u.role}</td><td>${u.email}</td><td>${u.phone||"—"}</td><td>${u.currentAddress||"—"} ${u.currentPostcode||""}</td><td>${u.drivingLicenceNo||"—"}</td><td>${u.drivingShareCode||"—"}</td><td>${u.rightToWorkShareCode||"—"}</td><td>${u.rightToWorkExpiry||"—"}</td><td>${u.visaType||"—"}</td><td>${u.status}</td></tr>`).join("")}
 </table></div></div>`;
}

function expiryBadge(dateStr){
 const d=daysUntil(dateStr);
 if(d===null)return '<span class="badge">Not Set</span>';
 if(d<0)return `<span class="badge red">Expired ${dateStr}</span>`;
 if(d<=30)return `<span class="badge amber">Expires ${dateStr}</span>`;
 return `<span class="badge green">${dateStr}</span>`;
}

function drawDVLARecords(c){
 checkDocumentExpiries();
 const s=ensureHRData(),rows=s.staffUsers||[];
 c.innerHTML=`<div class="panel"><h2>DVLA & Document Expiry Records</h2><p class="muted">Expired or expiring documents create portal notifications. Update dates when renewed.</p>
 <div class="scroll"><table style="min-width:1900px"><tr><th>Name</th><th>Role</th><th>Licence No</th><th>Licence Type</th><th>Country</th><th>Driving Share Code</th><th>Licence Expiry</th><th>DVLA Expiry</th><th>Passport Expiry</th><th>Visa Expiry</th><th>Right to Work Expiry</th><th>Safety Cert Expiry</th><th>Status</th><th>Action</th></tr>
 ${rows.map((u,i)=>`<tr><td><b>${u.name}</b></td><td>${u.role}</td><td>${u.drivingLicenceNo||"—"}</td><td>${u.licenceType||"—"}</td><td>${u.licenceCountry||"—"}</td><td>${u.drivingShareCode||"—"}</td><td>${expiryBadge(u.drivingLicenceExpiry)}</td><td>${expiryBadge(u.dvlaExpiry)}</td><td>${expiryBadge(u.passportExpiry)}</td><td>${expiryBadge(u.visaExpiry)}</td><td>${expiryBadge(u.rightToWorkExpiry)}</td><td>${expiryBadge(u.safetyExpiry)}</td><td>${u.status}</td><td><button class="btn secondary" onclick="editDocumentExpiries(${i})">Update Expiry Dates</button></td></tr>`).join("")}
 </table></div></div><div id="dvlaEditArea"></div>`;
}

function editDocumentExpiries(index){
 const s=ensureHRData(),u=s.staffUsers[index],box=document.getElementById("dvlaEditArea");if(!u||!box)return;
 box.innerHTML=`<div class="panel" style="margin-top:12px"><h3>Update Expiry Dates — ${u.name}</h3><div class="form">
  <label>Driving Licence Expiry<input id="edLicence" type="date" value="${u.drivingLicenceExpiry||""}"></label>
  <label>DVLA Record Expiry<input id="edDvla" type="date" value="${u.dvlaExpiry||""}"></label>
  <label>Passport Expiry<input id="edPassport" type="date" value="${u.passportExpiry||""}"></label>
  <label>Visa Expiry<input id="edVisa" type="date" value="${u.visaExpiry||""}"></label>
  <label>Right to Work / Share Code Expiry<input id="edRtw" type="date" value="${u.rightToWorkExpiry||""}"></label>
  <label>Driver Safety Certificate Expiry<input id="edSafety" type="date" value="${u.safetyExpiry||""}"></label>
 </div><div class="actions"><button class="btn primary" onclick="saveDocumentExpiries(${index})">Save Updated Expiry Dates</button></div></div>`;
 box.scrollIntoView({behavior:"smooth"});
}

function saveDocumentExpiries(index){
 let s=ensureHRData(),u=s.staffUsers[index];if(!u)return;
 u.drivingLicenceExpiry=document.getElementById("edLicence").value;
 u.dvlaExpiry=document.getElementById("edDvla").value;
 u.passportExpiry=document.getElementById("edPassport").value;
 u.visaExpiry=document.getElementById("edVisa").value;
 u.rightToWorkExpiry=document.getElementById("edRtw").value;
 u.safetyExpiry=document.getElementById("edSafety").value;
 u.updatedAt=new Date().toLocaleString();
 saveStore(s);checkDocumentExpiries();drawDVLARecords(document.getElementById("content"));
}

function ensureMessagingSettings(){
 let s=getStore(),changed=false;
 if(!s.messagingSettings){
  s.messagingSettings={
   whatsappEnabled:true,
   smsEnabled:true,
   provider:"Custom API / Twilio / WhatsApp Business",
   apiBaseUrl:"",
   apiKey:"",
   apiSecret:"",
   whatsappSender:"",
   smsSender:"",
   templates:{
    booked:{
     whatsapp:"Hello {receiverName}, your vehicle {vehicle} ({reg}) has been booked with UK On Wheels. Booking reference: {bookingRef}. Collection: {collection}. Delivery: {delivery}. We will keep you updated.",
     sms:"UK On Wheels: {vehicle} ({reg}) booked. Ref {bookingRef}. Collection: {collection}. Delivery: {delivery}."
    },
    pickedUp:{
     whatsapp:"Hello {receiverName}, your vehicle {vehicle} ({reg}) has now been picked up by UK On Wheels. Booking reference: {bookingRef}. We will notify you when it is on the way.",
     sms:"UK On Wheels: {vehicle} ({reg}), ref {bookingRef}, has been picked up."
    },
    onRoute:{
     whatsapp:"Hello {receiverName}, your vehicle {vehicle} ({reg}) is now on the way for delivery. Booking reference: {bookingRef}. Destination: {delivery}.",
     sms:"UK On Wheels: {vehicle} ({reg}), ref {bookingRef}, is now on the way to {delivery}."
    },
    delivered:{
     whatsapp:"Hello {receiverName}, your vehicle {vehicle} ({reg}) has been delivered. Booking reference: {bookingRef}. Thank you for using UK On Wheels.",
     sms:"UK On Wheels: {vehicle} ({reg}), ref {bookingRef}, has been delivered. Thank you."
    }
   }
  };
  changed=true;
 }
 if(!s.messageLog){s.messageLog=[];changed=true}
 if(changed)saveStore(s);
 return getStore();
}

function drawSettings(c){
 const s=ensureMessagingSettings(),m=s.messagingSettings;
 c.innerHTML=`<div class="panel">
  <h2>Settings</h2>
  <p class="muted">Configure WhatsApp and text-message templates plus the API credentials your production system will use to send customer updates.</p>
 </div>

 <div class="panel" style="margin-top:12px">
  <h3>Messaging API Settings</h3>
  <div class="form">
   <select id="msgProvider">
    <option ${m.provider==="Custom API / Twilio / WhatsApp Business"?"selected":""}>Custom API / Twilio / WhatsApp Business</option>
    <option ${m.provider==="Twilio"?"selected":""}>Twilio</option>
    <option ${m.provider==="Meta WhatsApp Business"?"selected":""}>Meta WhatsApp Business</option>
    <option ${m.provider==="Other"?"selected":""}>Other</option>
   </select>
   <input id="msgApiBaseUrl" value="${m.apiBaseUrl||""}" placeholder="API Base URL">
   <input id="msgApiKey" value="${m.apiKey||""}" placeholder="API Key / Account SID">
   <input id="msgApiSecret" type="password" value="${m.apiSecret||""}" placeholder="API Secret / Auth Token">
   <input id="msgWhatsAppSender" value="${m.whatsappSender||""}" placeholder="WhatsApp Sender Number / ID">
   <input id="msgSmsSender" value="${m.smsSender||""}" placeholder="SMS Sender Number / Sender ID">
   <label class="step" style="margin:0"><input id="msgWhatsAppEnabled" type="checkbox" ${m.whatsappEnabled?"checked":""}> Enable WhatsApp customer updates</label>
   <label class="step" style="margin:0"><input id="msgSmsEnabled" type="checkbox" ${m.smsEnabled?"checked":""}> Enable SMS customer updates</label>
  </div>
  <div class="actions"><button class="btn primary" onclick="saveMessagingSettings()">Save Messaging API Settings</button></div>
  <p class="muted">This browser prototype stores settings locally and simulates sending. Live messages require a secure backend connected to your chosen provider.</p>
 </div>

 <div class="panel" style="margin-top:12px">
  <h3>WhatsApp & Text Message Formats</h3>
  ${[
    ["booked","Vehicle Booked"],
    ["pickedUp","Vehicle Picked Up"],
    ["onRoute","Vehicle On The Way"],
    ["delivered","Vehicle Delivered"]
  ].map(([key,label])=>`<div style="border:1px solid var(--line);border-radius:10px;padding:14px;margin:12px 0">
    <h4 style="margin-top:0">${label}</h4>
    <label><b>WhatsApp Template</b></label>
    <textarea id="wa_${key}" style="width:100%;min-height:90px">${m.templates[key].whatsapp}</textarea>
    <label style="display:block;margin-top:10px"><b>SMS Template</b></label>
    <textarea id="sms_${key}" style="width:100%;min-height:75px">${m.templates[key].sms}</textarea>
  </div>`).join("")}
  <div class="actions"><button class="btn primary" onclick="saveMessageTemplates()">Save Message Formats</button></div>
  <p class="muted">Available fields: {receiverName}, {receiverMobile}, {vehicle}, {reg}, {bookingRef}, {collection}, {delivery}, {driver}, {amount}, {status}.</p>
 </div>

 <div class="panel" style="margin-top:12px">
  <h3>Customer Message Log</h3>
  <div class="scroll"><table style="min-width:1200px">
   <tr><th>Date/Time</th><th>Booking Ref</th><th>Receiver</th><th>Mobile</th><th>Event</th><th>Channel</th><th>Status</th><th>Message</th></tr>
   ${(s.messageLog||[]).slice().reverse().map(x=>`<tr><td>${x.createdAt}</td><td>${x.bookingRef}</td><td>${x.receiverName||"—"}</td><td>${x.mobile||"—"}</td><td>${x.event}</td><td>${x.channel}</td><td><span class="badge ${x.status==="Queued / Simulated"?"amber":"green"}">${x.status}</span></td><td>${x.message}</td></tr>`).join("")}
  </table></div>
 </div>`;
}

function saveMessagingSettings(){
 let s=ensureMessagingSettings(),m=s.messagingSettings;
 m.provider=document.getElementById("msgProvider").value;
 m.apiBaseUrl=document.getElementById("msgApiBaseUrl").value.trim();
 m.apiKey=document.getElementById("msgApiKey").value.trim();
 m.apiSecret=document.getElementById("msgApiSecret").value;
 m.whatsappSender=document.getElementById("msgWhatsAppSender").value.trim();
 m.smsSender=document.getElementById("msgSmsSender").value.trim();
 m.whatsappEnabled=document.getElementById("msgWhatsAppEnabled").checked;
 m.smsEnabled=document.getElementById("msgSmsEnabled").checked;
 saveStore(s);
 alert("Messaging API settings saved.");
 drawSettings(document.getElementById("content"));
}

function saveMessageTemplates(){
 let s=ensureMessagingSettings(),m=s.messagingSettings;
 ["booked","pickedUp","onRoute","delivered"].forEach(key=>{
   m.templates[key].whatsapp=document.getElementById("wa_"+key).value;
   m.templates[key].sms=document.getElementById("sms_"+key).value;
 });
 saveStore(s);
 alert("WhatsApp and SMS message formats saved.");
 drawSettings(document.getElementById("content"));
}

function fillMessageTemplate(template,b){
 const values={
  receiverName:b.receiver||b.privateCustomerName||"Customer",
  receiverMobile:b.receiverMobile||b.privateCustomerMobile||"",
  vehicle:b.vehicle||"",
  reg:b.reg||"",
  bookingRef:b.ref||"",
  collection:b.pickup||"",
  delivery:b.destination||"",
  driver:b.driver||"",
  amount:"£"+Number(b.amount||0).toFixed(2),
  status:b.status||""
 };
 return String(template||"").replace(/\{(\w+)\}/g,(m,k)=>values[k]!==undefined?values[k]:m);
}

function queueCustomerStatusMessage(b,eventKey){
 if(!b)return;
 let s=ensureMessagingSettings(),m=s.messagingSettings;
 const map={booked:"Vehicle Booked",pickedUp:"Vehicle Picked Up",onRoute:"Vehicle On The Way",delivered:"Vehicle Delivered"};
 const mobile=b.receiverMobile||b.privateCustomerMobile||"";
 const receiverName=b.receiver||b.privateCustomerName||"Customer";
 if(!mobile)return;
 const channels=[];
 if(m.whatsappEnabled)channels.push(["WhatsApp",m.templates[eventKey]?.whatsapp||""]);
 if(m.smsEnabled)channels.push(["SMS",m.templates[eventKey]?.sms||""]);
 channels.forEach(([channel,tpl])=>{
   s.messageLog.push({
    id:"MSG-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),
    bookingRef:b.ref,
    receiverName,
    mobile,
    event:map[eventKey]||eventKey,
    channel,
    status:"Queued / Simulated",
    message:fillMessageTemplate(tpl,b),
    createdAt:new Date().toLocaleString()
   });
 });
 saveStore(s);
}

function openStatusPage(status){
 selectedStatusPage=status;
 page="statusPage";
 render();
}

function drawStatusPage(c){
 const rows=getStore().bookings.filter(b=>b.status===selectedStatusPage);
 const titleMap={
  "New Booked Vehicle":"New Booked Vehicles",
  "Driver Assigned":"Driver Assigned",
  "Picked Up":"Picked Up Vehicles",
  "On Route":"On Route",
  "Delayed":"Delayed Vehicles",
  "Accident":"Accidents",
  "Claims":"Claims",
  "Delivered":"Delivered Vehicles",
  "Fault On Route":"Faults On The Route",
  "Assigned AA on Route":"Assigned AA On Route"
 };
 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
    <div><h2 style="margin:0">${titleMap[selectedStatusPage]||selectedStatusPage}</h2><p class="muted" style="margin:6px 0 0">All vehicle details for this status.</p></div>
    <div><span class="badge">${rows.length} vehicles</span> <button class="btn secondary" onclick="page='desktop';render()">Back to Dashboard</button></div>
  </div>
 </div>
 <div class="panel">
  <div class="scroll">
   <table style="min-width:1700px">
    <tr>
      <th>Booking Reference</th><th>Updated By</th><th>Updated Time</th><th>Approved By</th><th>Approval Time</th>
      <th>Business Name</th>
      <th>Vehicle</th>
      <th>Reg No</th>
      <th>Collection Address</th>
      <th>Delivery Address</th>
      <th>Service Used</th>
      <th>Miles Travelled</th>
      <th>Booking Date</th>
      <th>Delivery Date</th>
      <th>Person Receiving Vehicle</th>
      <th>Receiver Mobile</th>
      <th>Drop-off Time Till</th>
      <th>Driver</th>
      <th>Charge Amount</th>
      <th>Vehicle Status</th>
      <th>Payment Status</th>
      <th>Invoice No</th>
      <th>Pickup Evidence</th>
      <th>Action</th>
    </tr>
    ${rows.map(b=>`<tr>
      <td><b>${b.ref}</b></td><td>${b.lastUpdatedBy||"—"}</td><td>${b.lastUpdatedAt||"—"}</td><td>${b.lastApprovedBy||"—"}</td><td>${b.lastApprovedAt||"—"}</td>
      <td>${b.customerType==="Private"?(b.privateCustomerName||"Private Customer"):(b.business||"—")}</td>
      <td>${b.vehicle||"—"}</td>
      <td>${b.reg||"—"}</td>
      <td>${b.pickup||"—"}</td>
      <td>${b.destination||"—"}</td>
      <td>${b.service||"—"}</td>
      <td>${b.miles||0}</td>
      <td>${b.bookingDate||"—"}</td>
      <td>${b.deliveryDate||"—"}</td>
      <td>${b.receiver||"—"}</td>
      <td>${b.receiverMobile||"—"}</td>
      <td>${b.dropoffTill||"—"}</td>
      <td>${b.driver||"Not assigned"}</td>
      <td><b>£${Number(b.amount||0).toFixed(2)}</b></td>
      <td><span class="badge">${b.status}</span></td>
      <td><span class="badge ${(b.paymentStatus==="Paid")?"green":"amber"}">${b.paymentStatus==="Paid"?"Paid":"Not Paid"}</span></td>
      <td>${b.invoiceNo||"—"}</td>
      <td>${b.pickupCaptureMode?`<span class="badge green">${b.pickupCaptureMode}</span>`:"—"}</td>
      <td><button class="btn secondary" onclick="viewStatusBooking('${b.ref}')">View Details</button></td>
    </tr>`).join("")}
   </table>
  </div>
  ${rows.length?"":"<p class='muted'>No vehicles currently in this status.</p>"}
 </div>
 <div id="statusBookingDetail"></div>`;
}

function viewStatusBooking(ref){
 const b=getStore().bookings.find(x=>x.ref===ref);
 if(!b)return;
 statusBookingDetail.innerHTML=`<div class="panel" style="margin-top:12px">
  <div style="display:flex;justify-content:space-between;align-items:center"><h3>${b.ref} — ${b.vehicle}</h3><span class="badge">${b.status}</span></div>
  <div class="form">
    <div><b>Business Name</b><p>${b.customerType==="Private"?(b.privateCustomerName||"Private Customer"):(b.business||"—")}</p></div>
    <div><b>Registration</b><p>${b.reg||"—"}</p></div>
    <div><b>Collection Address</b><p>${b.pickup||"—"}</p></div>
    <div><b>Delivery Address</b><p>${b.destination||"—"}</p></div>
    <div><b>Service Used</b><p>${b.service||"—"}</p></div>
    <div><b>Miles Travelled</b><p>${b.miles||0}</p></div>
    <div><b>Booking Date</b><p>${b.bookingDate||"—"}</p></div>
    <div><b>Delivery Date</b><p>${b.deliveryDate||"—"}</p></div>
    <div><b>Person Receiving Vehicle</b><p>${b.receiver||"—"}</p></div>
    <div><b>Receiver Mobile</b><p>${b.receiverMobile||"—"}</p></div>
    <div><b>Drop-off Time Till</b><p>${b.dropoffTill||"—"}</p></div>
    <div><b>Assigned Driver</b><p>${b.driver||"Not assigned"}</p></div>
    <div><b>Charge Amount</b><p><strong>£${Number(b.amount||0).toFixed(2)}</strong></p></div>
    <div><b>Payment Status</b><p><span class="badge ${(b.paymentStatus==="Paid")?"green":"amber"}">${b.paymentStatus==="Paid"?"Paid":"Not Paid"}</span></p></div>
    <div><b>Invoice Number</b><p>${b.invoiceNo||"—"}</p></div>
    <div><b>Payment Date</b><p>${b.paidDate||"—"}</p></div>
    <div><b>Pickup Evidence</b><p>${b.pickupCaptureMode||"Not recorded"}</p></div>
  </div>
  <h4>Journey Timeline</h4>
  ${(b.timeline||[]).map(e=>`<div class="event"><b>${e.title}</b><div class="muted">${e.text}</div></div>`).join("")||"<p class='muted'>No timeline events yet.</p>"}
 </div>`;
 statusBookingDetail.scrollIntoView({behavior:"smooth"});
}

function findBookingByRef(ref){
 const clean=String(ref||"").trim().toUpperCase();
 return getStore().bookings.find(b=>String(b.ref||"").trim().toUpperCase()===clean);
}

function bookingSummaryTable(b){
 return `<div class="scroll"><table style="min-width:1450px">
 <tr><th>Booking Ref</th><th>Business</th><th>Vehicle</th><th>Reg</th><th>Collection</th><th>Destination</th><th>Service</th><th>Miles</th><th>Booking Date</th><th>Delivery Date</th><th>Receiver</th><th>Mobile</th><th>Driver</th><th>Amount</th><th>Status</th></tr>
 <tr><td><b>${b.ref}</b></td><td>${b.business||"—"}</td><td>${b.vehicle||"—"}</td><td>${b.reg||"—"}</td><td>${b.pickup||"—"}</td><td>${b.destination||"—"}</td><td>${b.service||"—"}</td><td>${b.miles||0}</td><td>${b.bookingDate||"—"}</td><td>${b.deliveryDate||"—"}</td><td>${b.receiver||"—"}</td><td>${b.receiverMobile||"—"}</td><td>${b.driver||"Not assigned"}</td><td>£${Number(b.amount||0).toFixed(2)}</td><td>${b.status||"—"}</td></tr>
 </table></div>`;
}

function drawAmountUpdate(c){
 c.innerHTML=`<div class="panel"><h2>Update Amount</h2>
 <p class="muted">Enter the Booking Reference and press Enter or Find Booking.</p>
 <input id="amountRef" placeholder="Example: BK00129" style="width:100%;padding:13px;border:1px solid var(--line);border-radius:8px;text-transform:uppercase">
 <div class="actions"><button class="btn primary" onclick="lookupAmountBooking()">Find Booking</button></div></div>
 <div id="amountResult"></div>`;
 const el=document.getElementById("amountRef");
 if(el)el.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();lookupAmountBooking();}});
}

function lookupAmountBooking(){
 const refEl=document.getElementById("amountRef"), box=document.getElementById("amountResult");
 if(!refEl||!box)return alert("Please reopen Update Amount.");
 const b=findBookingByRef(refEl.value);
 if(!b){box.innerHTML=`<div class="panel" style="margin-top:12px"><b>Booking not found.</b></div>`;return;}
 box.innerHTML=`<div class="panel" style="margin-top:12px"><h3>${b.ref} — ${b.vehicle}</h3>${bookingSummaryTable(b)}
 <div style="margin-top:16px;padding:14px;border:1px solid var(--line);border-radius:10px;background:#f9fbfe">
 <div class="form"><div><label><b>Current Amount</b></label><input value="£${Number(b.amount||0).toFixed(2)}" disabled></div>
 <div><label><b>New Amount (£)</b></label><input id="newAmountValue" type="number" min="0" step="0.01" value="${Number(b.amount||0).toFixed(2)}"></div></div>
 <div class="actions"><button class="btn primary" onclick="saveAmountUpdate('${b.ref}')">Save New Amount</button></div></div></div>`;
}

function saveAmountUpdate(ref){
 let s=getStore(), b=s.bookings.find(x=>String(x.ref).toUpperCase()===String(ref).toUpperCase());
 const el=document.getElementById("newAmountValue");
 if(!b||!el)return alert("Unable to update amount.");
 const value=Number(el.value);
 if(!Number.isFinite(value)||value<0)return alert("Please enter a valid amount.");
 const old=Number(b.amount||0);
 if(!confirm(`Change amount for ${b.ref} from £${old.toFixed(2)} to £${value.toFixed(2)}?`))return;
 b.amount=value;
 b.timeline=b.timeline||[];
 b.timeline.unshift({title:"Amount Updated",text:`Amount changed from £${old.toFixed(2)} to £${value.toFixed(2)} at ${new Date().toLocaleString()}`});
 s.notifications=s.notifications||[];
 s.notifications.unshift({title:"Amount Updated",text:`${b.ref} amount changed to £${value.toFixed(2)}.`});
 saveStore(s);
 alert("Amount updated successfully.");
 lookupAmountBooking();
}

function drawDestinationUpdate(c){
 c.innerHTML=`<div class="panel"><h2>Update Destination</h2>
 <p class="muted">Enter the Booking Reference and press Enter or Find Booking.</p>
 <input id="destinationRef" placeholder="Example: BK00129" style="width:100%;padding:13px;border:1px solid var(--line);border-radius:8px;text-transform:uppercase">
 <div class="actions"><button class="btn primary" onclick="lookupDestinationBooking()">Find Booking</button></div></div>
 <div id="destinationResult"></div>`;
 const el=document.getElementById("destinationRef");
 if(el)el.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();lookupDestinationBooking();}});
}

function lookupDestinationBooking(){
 const refEl=document.getElementById("destinationRef"), box=document.getElementById("destinationResult");
 if(!refEl||!box)return alert("Please reopen Update Destination.");
 const b=findBookingByRef(refEl.value);
 if(!b){box.innerHTML=`<div class="panel" style="margin-top:12px"><b>Booking not found.</b></div>`;return;}
 box.innerHTML=`<div class="panel" style="margin-top:12px"><h3>${b.ref} — ${b.vehicle}</h3>${bookingSummaryTable(b)}
 <div style="margin-top:16px;padding:14px;border:1px solid var(--line);border-radius:10px;background:#f9fbfe">
 <div class="form"><div><label><b>Current Destination</b></label><input value="${b.destination||""}" disabled></div>
 <div><label><b>New Destination</b></label><input id="newDestinationValue" type="text" value="${b.destination||""}" placeholder="Enter new delivery address"></div></div>
 <div class="actions"><button class="btn primary" onclick="saveDestinationUpdate('${b.ref}')">Save New Destination</button></div></div></div>`;
}

function saveDestinationUpdate(ref){
 let s=getStore(), b=s.bookings.find(x=>String(x.ref).toUpperCase()===String(ref).toUpperCase());
 const el=document.getElementById("newDestinationValue");
 if(!b||!el)return alert("Unable to update destination.");
 const value=el.value.trim();
 if(!value)return alert("Please enter the new destination.");
 const old=b.destination||"";
 if(!confirm(`Change destination for ${b.ref}?\n\nCurrent: ${old}\nNew: ${value}`))return;
 b.destination=value;
 b.timeline=b.timeline||[];
 b.timeline.unshift({title:"Destination Updated",text:`Destination changed from "${old}" to "${value}" at ${new Date().toLocaleString()}`});
 s.notifications=s.notifications||[];
 s.notifications.unshift({title:"Destination Updated",text:`${b.ref} destination changed to ${value}.`});
 saveStore(s);
 alert("Destination updated successfully.");
 lookupDestinationBooking();
}


function evidenceSection(b){
 const pickup=Object.values(b.pickupPhotos||{});
 const delivery=Object.values(b.deliveryPhotos||{});
 const de=b.deliveryEvidence||{};
 const img=(p,label)=>`<div class="evidenceCard"><b>${p.label||label}</b>${p.image?`<img src="${p.image}" style="width:100%;max-width:260px;border-radius:8px">`:""}<div class="muted">${p.dateText||""} ${p.timeText||""}</div></div>`;
 return `<div class="panel" style="margin-top:12px">
   <h3>Vehicle Evidence — ${b.ref}</h3>
   <h4>Pickup Pictures</h4>
   <div class="evidenceGrid">${pickup.length?pickup.map(p=>img(p,"Pickup Photo")).join(""):"<p class='muted'>Pickup pictures not available yet.</p>"}</div>
   <h4 style="margin-top:18px">Delivery Pictures</h4>
   <div class="evidenceGrid">${delivery.length?delivery.map(p=>img(p,"Delivery Photo")).join(""):"<p class='muted'>Delivery pictures not available yet.</p>"}</div>
   <div class="form" style="margin-top:16px">
    <div><b>Received By</b><p>${de.receiverName||b.receiver||"—"}</p></div>
    <div><b>Driver</b><p>${de.driver||b.driver||"—"}</p></div>
    <div><b>Delivery Date / Time</b><p>${de.deliveredAt?new Date(de.deliveredAt).toLocaleString():"—"}</p></div>
   </div>
   <div class="cards">
    <div class="card"><b>Receiver Signature</b>${de.receiverSignature?`<br><img src="${de.receiverSignature}" style="max-width:320px;width:100%;height:120px;object-fit:contain">`:"<p class='muted'>Not available</p>"}</div>
    <div class="card"><b>Driver Signature</b>${de.driverSignature?`<br><img src="${de.driverSignature}" style="max-width:320px;width:100%;height:120px;object-fit:contain">`:"<p class='muted'>Not available</p>"}</div>
   </div>
 </div>`;
}

/* === END RESTORED ADMIN MODULES === */

function drawDesktop(c){
 const s=getStore(),rows=visibleBookings(),tabs=statusTabs();
 c.innerHTML=`<div class="notice"><b>Latest update:</b> ${s.notifications[0]?.text||"No updates"}</div>
 <div class="cards">${tabs.slice(0,8).map(t=>`<div class="card"><b>${t}</b><strong>${rows.filter(b=>b.status===t).length}</strong></div>`).join("")}</div>
 <div class="tabs">${tabs.map((t,i)=>`<button class="${i===0?'active':''}" onclick="showTab('${t}',this)">${t}</button>`).join("")}</div><div id="tabarea"></div>`;
 showTab(tabs[0],document.querySelector(".tabs button"));
}
function showTab(status,btn){
 document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active")); if(btn)btn.classList.add("active");
 const rows=visibleBookings().filter(b=>b.status===status);
 tabarea.innerHTML=`<div class="panel"><h3>${status}</h3><div class="scroll"><table style="min-width:1450px"><tr><th>Booking Ref</th><th>Vehicle</th><th>Reg No</th><th>Collection</th><th>Delivery</th><th>Service</th><th>Miles</th><th>Booking Date</th><th>Delivery Date</th><th>Receiver</th><th>Mobile</th><th>Drop-off Till</th><th>Driver</th><th>Status</th></tr>${rows.map(b=>`<tr><td><b>${b.ref}</b></td><td>${b.vehicle}</td><td>${b.reg}</td><td>${b.pickup}</td><td>${b.destination}</td><td>${b.service}</td><td>${b.miles||0}</td><td>${b.bookingDate||""}</td><td>${b.deliveryDate||""}</td><td>${b.receiver||""}</td><td>${b.receiverMobile||""}</td><td>${b.dropoffTill||""}</td><td>${b.driver||"Not assigned"}</td><td><span class="badge">${b.status}</span>${b.pickupCaptureMode?`<div class="muted" style="font-size:10px;margin-top:4px">${b.pickupCaptureMode}</div>`:""}</td></tr>`).join("")}</table></div>${rows.length?"":"<p class='muted'>No vehicles in this status.</p>"}</div>`;
}
function drawBooking(c){
 const s=getStore();
 c.innerHTML=`<div class="panel"><h3>Create Booking</h3>
 <div class="form">
  ${role==="client"
    ? `<input id="customerType" type="hidden" value="Business"><div class="panel" style="padding:10px"><b>Booking For:</b> ${currentUser?.name||"Business Customer"}</div>`
    : `<select id="customerType" onchange="toggleCustomerTypeFields()"><option value="Business">Business Customer</option><option value="Private">Private Customer — Admin Only</option></select>`}
  ${role==="client"
      ? `<input id="biz" type="hidden" value="${currentUser?.name||"Prestige Motors Ltd"}"><div class="panel" style="padding:10px"><b>Business:</b> ${currentUser?.name||"Prestige Motors Ltd"}</div>`
      : `<select id="biz" onchange="showBusinessTariff()"><option value="">Select Business</option>${s.businesses.map(b=>`<option>${b.name}</option>`).join("")}<option value="__manual__">+ Add manually</option></select>`}
  <input id="privateCustomerName" placeholder="Private Customer Name *" style="display:none">
  <input id="privateCustomerMobile" placeholder="Private Customer Mobile Number" style="display:none">
  <input id="privateCustomerEmail" type="email" placeholder="Private Customer Email" style="display:none">

  <input id="veh" placeholder="Vehicle make & model">
  <input id="reg" placeholder="Registration number">
  <input id="pickup" placeholder="Collection address">
  <input id="dest" placeholder="Delivery address">
  <select id="service"><option>Vehicle Delivery</option><option>Vehicle Collection & Delivery</option><option>Recovery / AA</option></select>
  <input id="miles" type="number" placeholder="Miles travelled">
  <input id="bdate" type="date">
  <input id="ddate" type="date">
  <input id="receiver" placeholder="Person receiving vehicle">
  <input id="mobile" placeholder="Receiver mobile number">
  <input id="dropoff" type="time" title="Drop-off time till">
  <input id="amount" type="number" placeholder="Customer charge (£)">
  <textarea id="notes" class="full" placeholder="Special instructions"></textarea>
 </div>
 <div id="tariffInfo" class="full muted"></div>
 <div class="actions"><button class="btn primary" onclick="createBooking()">Create Booking</button></div></div>`;
 toggleCustomerTypeFields();
}
function toggleCustomerTypeFields(){
 const type=document.getElementById("customerType")?.value||"Business";
 const bizEl=document.getElementById("biz");
 const nameEl=document.getElementById("privateCustomerName");
 const mobileEl=document.getElementById("privateCustomerMobile");
 const emailEl=document.getElementById("privateCustomerEmail");
 const tariffEl=document.getElementById("tariffInfo");
 const isPrivate=type==="Private";
 if(bizEl)bizEl.style.display=isPrivate?"none":"block";
 if(nameEl)nameEl.style.display=isPrivate?"block":"none";
 if(mobileEl)mobileEl.style.display=isPrivate?"block":"none";
 if(emailEl)emailEl.style.display=isPrivate?"block":"none";
 if(isPrivate && tariffEl)tariffEl.innerHTML="";
}
function showBusinessTariff(){
 const s=getStore();
 const bizEl=document.getElementById("biz");
 const tariffEl=document.getElementById("tariffInfo");
 const b=s.businesses.find(x=>x.name===(bizEl?.value||""));
 if(!b){if(tariffEl)tariffEl.innerHTML="";return}
 tariffEl.innerHTML=`<div class="panel" style="padding:10px"><b>Assigned Tariff:</b> ${b.tariffType||"Not set"} ${b.perMile?`· £${Number(b.perMile).toFixed(2)} per mile`:""} ${b.minimumCharge?`· Minimum £${Number(b.minimumCharge).toFixed(2)}`:""} · Invoice: ${b.invoiceCycle||"Not set"}</div>`;
}
function createBooking(){
 let s=getStore();
 const type=role==="client"?"Business":(document.getElementById("customerType")?.value||"Business");

 let business="";
 let privateCustomerNameValue="";
 let privateCustomerMobileValue="";
 let privateCustomerEmailValue="";

 if(role==="client"){
   business=currentUser?.name||"Prestige Motors Ltd";
 }else if(type==="Business"){
   business=document.getElementById("biz")?.value||"";
   if(business==="__manual__"){
     business=prompt("Business name");
     if(!business)return;
     if(!s.businesses.some(x=>String(x.name||"").toLowerCase()===business.toLowerCase())){
       s.businesses.push({name:business,contact:"",phone:""});
     }
   }
   if(!business)return alert("Please select a business.");
 }else{
   privateCustomerNameValue=document.getElementById("privateCustomerName")?.value.trim()||"";
   privateCustomerMobileValue=document.getElementById("privateCustomerMobile")?.value.trim()||"";
   privateCustomerEmailValue=document.getElementById("privateCustomerEmail")?.value.trim()||"";
   if(!privateCustomerNameValue)return alert("Please enter the private customer name.");
   business="Private Customer";
 }

 const vehicle=document.getElementById("veh")?.value.trim()||"";
 const regValue=document.getElementById("reg")?.value.trim()||"";
 const pickupValue=document.getElementById("pickup")?.value.trim()||"";
 const destinationValue=document.getElementById("dest")?.value.trim()||"";
 const receiverValue=document.getElementById("receiver")?.value.trim()||"";
 const receiverMobileValue=document.getElementById("mobile")?.value.trim()||"";

 if(!vehicle||!regValue||!pickupValue||!destinationValue||!receiverValue||!receiverMobileValue){
   return alert("Please complete vehicle, registration, collection, delivery and receiver details.");
 }

 const ref="BK"+String(Date.now()).slice(-6);
 const booking={
  ref,
  customerType:type,
  business,
  privateCustomerName:privateCustomerNameValue,
  privateCustomerMobile:privateCustomerMobileValue,
  privateCustomerEmail:privateCustomerEmailValue,
  vehicle,
  reg:regValue,
  pickup:pickupValue,
  destination:destinationValue,
  service:document.getElementById("service")?.value||"Vehicle Delivery",
  miles:Number(document.getElementById("miles")?.value||0),
  bookingDate:document.getElementById("bdate")?.value||new Date().toISOString().slice(0,10),
  deliveryDate:document.getElementById("ddate")?.value||"",
  receiver:receiverValue,
  receiverMobile:receiverMobileValue,
  dropoffTill:document.getElementById("dropoff")?.value||"",
  amount:Number(document.getElementById("amount")?.value||0),
  status:"New Booked Vehicle",
  paymentStatus:"Pending",
  driver:"",
  createdBy:role==="client"?(currentUser?.userName||currentUser?.name||"Client"):(currentUser?.name||"Admin"),
  createdAt:new Date().toLocaleString(),
  timeline:[{title:"Booking Created",text:"Booking created at "+new Date().toLocaleString()+" by "+(role==="client"?(currentUser?.userName||currentUser?.name||"Client"):(currentUser?.name||"Admin"))}]
 };

 s.bookings.unshift(booking);
 s.notifications=s.notifications||[];
 s.notifications.unshift({title:"New Booking",text:`${ref} created for ${role==="client"?business:(type==="Private"?privateCustomerNameValue:business)}.`});
 saveStore(s);

 if(typeof queueCustomerStatusMessage==="function")queueCustomerStatusMessage(booking,"booked");

 alert("Booking created successfully: "+ref);

 // Client goes to Bookings, Admin goes to Dashboard.
 if(role==="client"){page="clientBookings";render();}
 else {page="desktop";render();}
}
function drawBusinesses(c){
 const s=getStore();
 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h2 style="margin:0">Businesses</h2><p class="muted" style="margin:6px 0 0">Create and manage complete business accounts, billing details and assigned tariffs.</p></div>
   <span class="badge">${s.businesses.length} businesses</span>
  </div>
 </div>

 <div class="panel" style="margin-top:12px">
  <h3>Create / Update Business Account</h3>
  <div class="form">
   <input id="bizName" placeholder="Business Name *">
   <input id="bizType" placeholder="Business Type">
   <input id="bizAddress" placeholder="Business Address *">
   <input id="bizPostcode" placeholder="Business Post Code *">
   <input id="bizEmail" type="email" placeholder="Business Email Address *">
   <input id="bizPhone" placeholder="Business Phone Number *">
   <input id="bizVat" placeholder="VAT Number">
   <input id="bizReg" placeholder="Company Registration Number">
   <input id="bizBranches" class="full" placeholder="Branch Areas / Locations (e.g. Glasgow, Edinburgh, Manchester)">
   <select id="bizInvoiceCycle">
    <option value="">Invoice Payment Option *</option>
    <option>Weekly</option>
    <option>Monthly</option>
   </select>
   <input id="bizPassword" type="password" placeholder="Create Password *">
   <input id="bizAccountName" placeholder="Accounts Department Contact Name">
   <input id="bizAccountPhone" placeholder="Accounts Department Phone">
   <input id="bizAccountEmail" type="email" placeholder="Accounts Department Email">
   <select id="bizTariffType">
    <option value="">Tariff Type *</option>
    <option>Per Mile</option>
    <option>Fixed Rate</option>
    <option>Custom Tariff</option>
   </select>
   <input id="bizPerMile" type="number" step="0.01" placeholder="Per Mile Charge (£)">
   <input id="bizMinimum" type="number" step="0.01" placeholder="Minimum Charge (£)">
   <textarea id="bizTariffNotes" class="full" placeholder="Tariff Notes / Special Pricing"></textarea>
  </div>
  <div class="actions"><button class="btn primary" onclick="saveBusinessProfile()">Create Business</button></div>
 </div>

 <div class="panel" style="margin-top:12px">
  <h3>Business Accounts</h3>
  <div class="scroll">
   <table style="min-width:1800px">
    <tr>
     <th>Business Name</th><th>Type</th><th>Address</th><th>Post Code</th><th>Email</th><th>Phone</th>
     <th>VAT No.</th><th>Company Reg.</th><th>Branches</th><th>Invoice Cycle</th>
     <th>Accounts Contact</th><th>Accounts Phone</th><th>Accounts Email</th>
     <th>Tariff</th><th>Per Mile</th><th>Minimum</th><th>Password</th><th>Action</th>
    </tr>
    ${s.businesses.map((b,i)=>`<tr>
      <td><b>${b.name||"—"}</b></td>
      <td>${b.type||"—"}</td>
      <td>${b.address||"—"}</td>
      <td>${b.postcode||"—"}</td>
      <td>${b.email||"—"}</td>
      <td>${b.phone||"—"}</td>
      <td>${b.vatNumber||"—"}</td>
      <td>${b.companyReg||"—"}</td>
      <td>${b.branches||"—"}</td>
      <td>${b.invoiceCycle||"—"}</td>
      <td>${b.accountsName||"—"}</td>
      <td>${b.accountsPhone||"—"}</td>
      <td>${b.accountsEmail||"—"}</td>
      <td>${b.tariffType||"—"}</td>
      <td>${b.perMile?`£${Number(b.perMile).toFixed(2)}`:"—"}</td>
      <td>${b.minimumCharge?`£${Number(b.minimumCharge).toFixed(2)}`:"—"}</td>
      <td><span class="badge">${b.passwordCreated?"Created":"Not Set"}</span></td>
      <td><button class="btn secondary" onclick="editBusiness(${i})">Edit</button> <button class="btn secondary" onclick="changeBusinessPassword(${i})">Change Password</button></td>
    </tr>`).join("")}
   </table>
  </div>
 </div>`;
}
function saveBusinessProfile(){
 let s=getStore();
 const name=bizName.value.trim();
 if(!name||!bizAddress.value.trim()||!bizPostcode.value.trim()||!bizEmail.value.trim()||!bizPhone.value.trim()||!bizInvoiceCycle.value||!bizTariffType.value||!bizPassword.value){
   return alert("Please complete Business Name, Address, Post Code, Email, Phone, Invoice Payment Option, Tariff Type and Create Password.");
 }
 if(s.businesses.some(b=>String(b.name).toLowerCase()===name.toLowerCase()))return alert("A business with this name already exists.");
 s.businesses.push({
   name,
   type:bizType.value.trim(),
   address:bizAddress.value.trim(),
   postcode:bizPostcode.value.trim(),
   email:bizEmail.value.trim(),
   phone:bizPhone.value.trim(),
   vatNumber:bizVat.value.trim(),
   companyReg:bizReg.value.trim(),
   branches:bizBranches.value.trim(),
   invoiceCycle:bizInvoiceCycle.value,
   accountsName:bizAccountName.value.trim(),
   accountsPhone:bizAccountPhone.value.trim(),
   accountsEmail:bizAccountEmail.value.trim(),
   tariffType:bizTariffType.value,
   perMile:Number(bizPerMile.value||0),
   minimumCharge:Number(bizMinimum.value||0),
   tariffNotes:bizTariffNotes.value.trim(),
   passwordCreated:true
 });
 s.notifications.unshift({title:"Business Created",text:name+" business account created with "+bizTariffType.value+" tariff."});
 saveStore(s);
 alert("Business account created successfully.");
 drawBusinesses(document.getElementById("content"));
}
function editBusiness(index){
 const s=getStore(),b=s.businesses[index];
 if(!b)return;
 const updatedName=prompt("Business Name",b.name||""); if(updatedName===null)return;
 const updatedPhone=prompt("Business Phone",b.phone||""); if(updatedPhone===null)return;
 const updatedEmail=prompt("Business Email",b.email||""); if(updatedEmail===null)return;
 const updatedCycle=prompt("Invoice Payment Option: Weekly or Monthly",b.invoiceCycle||"Monthly"); if(updatedCycle===null)return;
 const updatedPerMile=prompt("Per Mile Charge (£)",b.perMile||0); if(updatedPerMile===null)return;
 b.name=updatedName.trim()||b.name;
 b.phone=updatedPhone.trim();
 b.email=updatedEmail.trim();
 b.invoiceCycle=updatedCycle.trim();
 b.perMile=Number(updatedPerMile||0);
 s.notifications.unshift({title:"Business Updated",text:b.name+" account details updated."});
 saveStore(s); drawBusinesses(document.getElementById("content"));
}
function changeBusinessPassword(index){
 const s=getStore(),b=s.businesses[index];
 if(!b)return;
 const p1=prompt("Enter new password for "+b.name);
 if(!p1)return;
 const p2=prompt("Confirm new password");
 if(p1!==p2)return alert("Passwords do not match.");
 b.passwordCreated=true;
 b.passwordChangedAt=new Date().toLocaleString();
 s.notifications.unshift({title:"Business Password Changed",text:b.name+" password changed."});
 saveStore(s);
 alert("Password changed successfully for "+b.name+".");
 drawBusinesses(document.getElementById("content"));
}
function addBusiness(){ alert('Use the full Create Business form above.'); }
function drawAssign(c){
 const s=getStore();
 const rows=s.bookings.filter(b=>b.status==="New Booked Vehicle");
 c.innerHTML=`<div class="panel">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
     <div><h2 style="margin:0">Assign Driver</h2><p class="muted" style="margin:6px 0 0">Review the full vehicle and client details before assigning the correct driver.</p></div>
     <span class="badge">${rows.length} bookings waiting</span>
   </div>
 </div>
 ${rows.length?rows.map(b=>`<div class="panel" style="margin-top:12px">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
     <div>
       <h3 style="margin:0">${b.ref} — ${b.vehicle}</h3>
       <div class="muted" style="margin-top:4px">${b.business}</div>
     </div>
     <span class="badge">${b.status}</span>
   </div>

   <div class="scroll" style="margin-top:14px">
    <table style="min-width:1500px">
      <tr>
        <th>Booking Reference</th>
        <th>Business Name</th>
        <th>Vehicle</th>
        <th>Reg No</th>
        <th>Collection Address</th>
        <th>Delivery Address</th>
        <th>Service Used</th>
        <th>Miles</th>
        <th>Booking Date</th>
        <th>Delivery Date</th>
        <th>Person Receiving Vehicle</th>
        <th>Receiver Mobile</th>
        <th>Drop-off Time Till</th>
        <th>Amount</th>
      </tr>
      <tr>
        <td><b>${b.ref}</b></td>
        <td>${b.customerType==="Private"?(b.privateCustomerName||"Private Customer"):(b.business||"—")}</td>
        <td>${b.vehicle||"—"}</td>
        <td>${b.reg||"—"}</td>
        <td>${b.pickup||"—"}</td>
        <td>${b.destination||"—"}</td>
        <td>${b.service||"—"}</td>
        <td>${b.miles||0}</td>
        <td>${b.bookingDate||"—"}</td>
        <td>${b.deliveryDate||"—"}</td>
        <td>${b.receiver||"—"}</td>
        <td>${b.receiverMobile||"—"}</td>
        <td>${b.dropoffTill||"—"}</td>
        <td>£${Number(b.amount||0).toFixed(2)}</td>
      </tr>
    </table>
   </div>

   <div style="margin-top:16px;padding:14px;border:1px solid var(--line);border-radius:10px;background:#f9fbfe">
     <h4 style="margin-top:0">Designated Driver Assignment Area</h4>
     <div class="form">
       <select id="driver_${b.ref}">
         <option value="">Select Driver *</option>
         ${s.drivers.map(d=>`<option value="${d.name}">${d.name} — ${d.phone}</option>`).join("")}
       </select>
       <input id="assignDate_${b.ref}" type="date" title="Assignment date">
       <input id="assignTime_${b.ref}" type="time" title="Assignment time">
       <input id="collectionTime_${b.ref}" type="time" title="Collection time">
       <textarea id="driverNotes_${b.ref}" class="full" placeholder="Driver instructions / collection notes / special requirements"></textarea>
     </div>
     <div class="actions">
       <button class="btn primary" onclick="assignSpecificDriver('${b.ref}')">Assign Driver to This Booking</button>
     </div>
   </div>
 </div>`).join(""):`<div class="panel"><p class="muted">No new booked vehicles are waiting for driver assignment.</p></div>`}`;
}
function assignSpecificDriver(ref){
 let s=getStore();
 const b=s.bookings.find(x=>x.ref===ref);
 const driverName=document.getElementById("driver_"+ref).value;
 if(!b||!driverName)return alert("Please select a driver for this booking.");

 b.driver=driverName;
 b.status="Driver Assigned";
 b.assignmentDate=document.getElementById("assignDate_"+ref).value;
 b.assignmentTime=document.getElementById("assignTime_"+ref).value;
 b.collectionTime=document.getElementById("collectionTime_"+ref).value;
 b.driverNotes=document.getElementById("driverNotes_"+ref).value.trim();

 b.timeline=b.timeline||[];
 b.timeline.unshift({
   title:"Driver Assigned",
   text:driverName+" assigned to "+ref+" at "+new Date().toLocaleString()
 });

 s.notifications.unshift({
   title:"Driver Assigned",
   text:ref+" assigned to "+driverName+"."
 });

 saveStore(s);
 alert(driverName+" assigned successfully to "+ref+".");
 drawAssign(document.getElementById("content"));
}
function assignDriver(){ alert("Please use the designated assignment area on the booking you want to assign."); }

function ensureApprovalData(){
 let s=getStore(),changed=false;
 if(!s.updateRequests){s.updateRequests=[];changed=true}
 if(changed)saveStore(s);
 return getStore();
}
function currentApproverRole(){
 if(role==="admin")return "Admin";
 if(role==="staff")return currentStaffUser?.role||"Staff";
 return role;
}
function canApproveUpdates(){
 const r=currentApproverRole();
 return ["Super Admin","Admin","Operations Manager"].includes(r);
}
function drawSingleBookingUpdate(c){
 const s=ensureApprovalData();
 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h2 style="margin:0">Single Booking Update</h2><p class="muted" style="margin:6px 0 0">Enter one Booking Reference to update Status, Miles, Amount and Destination in one place.</p></div>
   <button class="btn secondary" onclick="page='desktop';render()">Back to Dashboard</button>
  </div>
 </div>
 <div class="panel" style="margin-top:12px">
  <label><b>Booking Reference</b></label>
  <input id="singleUpdateRef" placeholder="Example: BK00129" style="width:100%;padding:13px;border:1px solid var(--line);border-radius:8px;text-transform:uppercase">
  <div class="actions"><button class="btn primary" onclick="findSingleBookingUpdate()">Find Booking</button></div>
 </div>
 <div id="singleUpdateArea"></div>`;
 const el=document.getElementById("singleUpdateRef");
 if(el)el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();findSingleBookingUpdate()}});
}
function findSingleBookingUpdate(){
 const s=ensureApprovalData(),refEl=document.getElementById("singleUpdateRef"),box=document.getElementById("singleUpdateArea");
 if(!refEl||!box)return;
 const ref=refEl.value.trim().toUpperCase();
 const b=s.bookings.find(x=>String(x.ref||"").toUpperCase()===ref);
 if(!b){box.innerHTML=`<div class="panel" style="margin-top:12px"><b>Booking not found.</b></div>`;return}
 const statuses=["New Booked Vehicle","Driver Assigned","Picked Up","On Route","Delayed","Accident","Claims","Delivered","Fault On Route","Assigned AA on Route"];
 box.innerHTML=`<div class="panel" style="margin-top:12px">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h3 style="margin:0">${b.ref} — ${b.vehicle}</h3><div class="muted">${b.customerType==="Private"?(b.privateCustomerName||"Private Customer"):(b.business||"—")}</div></div>
   <span class="badge">${b.status}</span>
  </div>
  <div class="scroll" style="margin-top:14px"><table style="min-width:1450px">
   <tr><th>Booking Ref</th><th>Last Updated By</th><th>Updated Time</th><th>Approved By</th><th>Approval Time</th><th>Business</th><th>Vehicle</th><th>Reg</th><th>Collection</th><th>Destination</th><th>Miles</th><th>Amount</th><th>Status</th></tr>
   <tr><td><b>${b.ref}</b></td><td>${b.createdBy||"—"}</td><td>${b.createdAt||"—"}</td><td>${b.lastUpdatedBy||"—"}</td><td>${b.lastUpdatedAt||"—"}</td><td>${b.lastApprovedBy||"—"}</td><td>${b.lastApprovedAt||"—"}</td><td>${b.customerType==="Private"?(b.privateCustomerName||"Private Customer"):(b.business||"—")}</td><td>${b.vehicle||"—"}</td><td>${b.reg||"—"}</td><td>${b.pickup||"—"}</td><td>${b.destination||"—"}</td><td>${b.miles||0}</td><td>£${Number(b.amount||0).toFixed(2)}</td><td>${b.status}</td></tr>
  </table></div>

  <div style="margin-top:16px;padding:15px;border:1px solid var(--line);border-radius:10px;background:#f9fbfe">
   <h4 style="margin-top:0">Proposed Changes</h4>
   <div class="form">
    <div><label><b>Status</b></label><select id="suStatus">${statuses.map(x=>`<option ${x===b.status?"selected":""}>${x}</option>`).join("")}</select></div>
    <div><label><b>Miles</b></label><input id="suMiles" type="number" min="0" value="${b.miles||0}"></div>
    <div><label><b>Amount (£)</b></label><input id="suAmount" type="number" min="0" step="0.01" value="${Number(b.amount||0).toFixed(2)}"></div>
    <div><label><b>Destination</b></label><input id="suDestination" value="${b.destination||""}"></div>
    <textarea id="suReason" class="full" placeholder="Reason / notes for this update"></textarea>
   </div>
   <div class="actions"><button class="btn primary" onclick="submitSingleBookingUpdate('${b.ref}')">Submit Update for Approval</button></div>
  </div>

  <h4>Update / Approval History</h4>
  ${(b.approvalHistory||[]).slice().reverse().map(h=>`<div class="event"><b>${h.action}</b><div class="muted">Requested by ${h.requestedBy||"—"} at ${h.requestedAt||"—"} · Approved by ${h.approvedBy||"Pending"} ${h.approvedAt?"at "+h.approvedAt:""}</div><div>${h.summary||""}</div></div>`).join("")||"<p class='muted'>No approval history yet.</p>"}
 </div>`;
}
function submitSingleBookingUpdate(ref){
 let s=ensureApprovalData(),b=s.bookings.find(x=>x.ref===ref);
 if(!b)return;
 const requestedBy=currentUser?.name||currentStaffUser?.name||"User";
 const requestedRole=currentApproverRole();
 const changes={
  status:document.getElementById("suStatus").value,
  miles:Number(document.getElementById("suMiles").value||0),
  amount:Number(document.getElementById("suAmount").value||0),
  destination:document.getElementById("suDestination").value.trim()
 };
 const reason=document.getElementById("suReason").value.trim();
 const req={
  id:"UPD-"+Date.now(),
  bookingRef:ref,
  requestedBy,
  requestedRole,
  requestedAt:new Date().toLocaleString(),
  changes,
  previous:{status:b.status,miles:b.miles||0,amount:b.amount||0,destination:b.destination||""},
  reason,
  status:"Pending Approval"
 };
 s.updateRequests.push(req);
 b.lastUpdatedBy=requestedBy;
 b.lastUpdatedAt=req.requestedAt;
 b.approvalHistory=b.approvalHistory||[];
 b.approvalHistory.push({action:"Update Requested",requestedBy,requestedAt:req.requestedAt,summary:`Status ${b.status} → ${changes.status}; Miles ${b.miles||0} → ${changes.miles}; Amount £${Number(b.amount||0).toFixed(2)} → £${changes.amount.toFixed(2)}; Destination ${b.destination||""} → ${changes.destination}`});
 s.notifications.unshift({title:"Update Approval Required",text:`${ref} update requested by ${requestedBy}.`});
 saveStore(s);
 alert("Update submitted for approval.");
 findSingleBookingUpdate();
}
function drawUpdateApprovals(c){
 const s=ensureApprovalData(),rows=s.updateRequests.filter(r=>r.status==="Pending Approval");
 c.innerHTML=`<div class="panel">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
   <div><h2 style="margin:0">Update Approvals</h2><p class="muted" style="margin:6px 0 0">Only Super Admin, Admin and Operations Manager can approve or reject booking changes.</p></div>
   <span class="badge">${rows.length} pending</span>
  </div>
 </div>
 ${rows.length?rows.map(r=>{
  const b=s.bookings.find(x=>x.ref===r.bookingRef);
  return `<div class="panel" style="margin-top:12px">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
    <div><h3 style="margin:0">${r.bookingRef} — ${b?.vehicle||""}</h3><div class="muted">Requested by ${r.requestedBy} (${r.requestedRole}) at ${r.requestedAt}</div></div>
    <span class="badge amber">${r.status}</span>
   </div>
   <div class="scroll" style="margin-top:12px"><table style="min-width:1000px"><tr><th>Field</th><th>Current</th><th>Proposed</th></tr>
    <tr><td>Status</td><td>${r.previous.status}</td><td>${r.changes.status}</td></tr>
    <tr><td>Miles</td><td>${r.previous.miles}</td><td>${r.changes.miles}</td></tr>
    <tr><td>Amount</td><td>£${Number(r.previous.amount||0).toFixed(2)}</td><td>£${Number(r.changes.amount||0).toFixed(2)}</td></tr>
    <tr><td>Destination</td><td>${r.previous.destination}</td><td>${r.changes.destination}</td></tr>
   </table></div>
   <p><b>Reason:</b> ${r.reason||"No reason entered."}</p>
   <div class="actions">
    ${canApproveUpdates()?`<button class="btn primary" onclick="approveUpdateRequest('${r.id}')">Approve</button><button class="btn danger" onclick="rejectUpdateRequest('${r.id}')">Reject</button>`:`<span class="badge red">You do not have approval permission</span>`}
   </div>
  </div>`;
 }).join(""):`<div class="panel" style="margin-top:12px"><p class="muted">No pending update approvals.</p></div>`}`;
}
function approveUpdateRequest(id){
 if(!canApproveUpdates())return alert("Only Super Admin, Admin and Operations Manager can approve updates.");
 let s=ensureApprovalData(),r=s.updateRequests.find(x=>x.id===id),b=s.bookings.find(x=>x.ref===r?.bookingRef);
 if(!r||!b)return;
 const approvedBy=currentUser?.name||currentStaffUser?.name||"Approver";
 const approvedAt=new Date().toLocaleString();
 b.status=r.changes.status;
 b.miles=r.changes.miles;
 b.amount=r.changes.amount;
 b.destination=r.changes.destination;
 b.lastApprovedBy=approvedBy;
 b.lastApprovedAt=approvedAt;
 b.timeline=b.timeline||[];
 b.timeline.unshift({title:"Approved Booking Update",text:`Approved by ${approvedBy} at ${approvedAt}`});
 b.approvalHistory=b.approvalHistory||[];
 const hist=b.approvalHistory.find(h=>h.action==="Update Requested"&&h.requestedAt===r.requestedAt);
 if(hist){hist.approvedBy=approvedBy;hist.approvedAt=approvedAt;hist.action="Update Approved";}
 r.status="Approved";r.approvedBy=approvedBy;r.approvedAt=approvedAt;
 s.notifications.unshift({title:"Booking Update Approved",text:`${b.ref} update approved by ${approvedBy}.`});
 saveStore(s);
 alert("Update approved and applied.");
 drawUpdateApprovals(document.getElementById("content"));
}
function rejectUpdateRequest(id){
 if(!canApproveUpdates())return alert("Only Super Admin, Admin and Operations Manager can reject updates.");
 let s=ensureApprovalData(),r=s.updateRequests.find(x=>x.id===id),b=s.bookings.find(x=>x.ref===r?.bookingRef);
 if(!r||!b)return;
 const rejectedBy=currentUser?.name||currentStaffUser?.name||"Approver";
 const rejectedAt=new Date().toLocaleString();
 r.status="Rejected";r.approvedBy=rejectedBy;r.approvedAt=rejectedAt;
 b.approvalHistory=b.approvalHistory||[];
 b.approvalHistory.push({action:"Update Rejected",requestedBy:r.requestedBy,requestedAt:r.requestedAt,approvedBy:rejectedBy,approvedAt:rejectedAt,summary:r.reason||""});
 s.notifications.unshift({title:"Booking Update Rejected",text:`${b.ref} update rejected by ${rejectedBy}.`});
 saveStore(s);
 alert("Update rejected.");
 drawUpdateApprovals(document.getElementById("content"));
}
function drawStatus(c){
 const s=getStore();c.innerHTML=`<div class="panel"><h3>Status Update</h3><div class="form"><select id="sb">${s.bookings.map(b=>`<option value="${b.ref}">${b.ref} — ${b.status}</option>`).join("")}</select><select id="ss">${statusTabs().map(x=>`<option>${x}</option>`).join("")}</select></div><div class="actions"><button class="btn primary" onclick="updateStatus()">Update</button></div></div>`;
}
function updateStatus(){let s=getStore(),b=s.bookings.find(x=>x.ref===sb.value);b.status=ss.value;b.timeline.unshift({title:ss.value,text:"Status updated at "+new Date().toLocaleString()});saveStore(s);page="desktop";render()}
function drawNotifications(c){
 const s=getStore();c.innerHTML=`<div class="panel"><h3>Notifications</h3><div class="form"><input id="nt" placeholder="Title"><textarea id="nm" placeholder="Message"></textarea></div><div class="actions"><button class="btn primary" onclick="postNotification()">Post Update</button></div>${s.notifications.map(n=>`<p><b>${n.title}</b> — ${n.text}</p>`).join("")}</div>`;
}
function postNotification(){let s=getStore();s.notifications.unshift({title:nt.value||"Update",text:nm.value||""});saveStore(s);draw()}
function drawReports(c){
 c.innerHTML=`<div class="panel"><h3>Reports & Invoices</h3><p class="muted">This connected prototype keeps the same booking data visible to the client. Invoice generation remains the next module.</p></div>`;
}

let driverMobileTab="jobs";
function setDriverMobileTab(tab){
 driverMobileTab=tab;
 drawDriver(document.getElementById("content"));
}
function driverAssignedRows(){
 const s=getStore();
 const name=currentUser?.name||currentStaffUser?.name||"James Wilson";
 return (s.bookings||[]).filter(b=>b.customerType!=="Private" && b.driver===name);
}
function driverStatusCounts(rows){
 return {
  active:rows.filter(b=>["Driver Assigned","Picked Up","On Route","Delayed","Accident","Fault On Route","Assigned AA on Route"].includes(b.status)).length,
  delivered:rows.filter(b=>b.status==="Delivered").length,
  assigned:rows.filter(b=>b.status==="Driver Assigned").length
 };
}
function driverMobileNav(){
 return `<div class="driverBottomNav">
  <button class="${driverMobileTab==="jobs"?"active":""}" onclick="setDriverMobileTab('jobs')"><span>🚘</span>Jobs</button>
  <button class="${driverMobileTab==="holidays"?"active":""}" onclick="setDriverMobileTab('holidays')"><span>📅</span>Holidays</button>
  <button class="${driverMobileTab==="history"?"active":""}" onclick="setDriverMobileTab('history')"><span>🧾</span>History</button>
  <button class="${driverMobileTab==="profile"?"active":""}" onclick="setDriverMobileTab('profile')"><span>👤</span>Profile</button>
 </div>`;
}
function driverMobileJobCard(b){
 const payment=b.paymentStatus==="Paid"?"Paid":"Not Paid";
 return `<div class="driverJob">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
   <div><span class="badge">${b.status}</span></div>
   <div class="driverPill">${b.ref}</div>
  </div>
  <h3>${b.vehicle||"Vehicle"} <span class="muted">${b.reg||""}</span></h3>
  <div class="driverRoute"><b>${b.pickup||"—"}</b><br><span class="muted">↓ deliver to</span><br><b>${b.destination||"—"}</b></div>
  <div class="driverMeta">
   <div><b>Receiver</b><br>${b.receiver||"—"}</div>
   <div><b>Mobile</b><br>${b.receiverMobile||"—"}</div>
   <div><b>Miles</b><br>${b.miles||0}</div>
   <div><b>Amount</b><br>£${Number(b.amount||0).toFixed(2)}</div>
  </div>
  ${b.status==="Driver Assigned"?pickupSteps(b):
    b.status==="Picked Up"?onRouteSteps(b):
    b.status==="On Route"||["Delayed","Accident","Fault On Route","Assigned AA on Route"].includes(b.status)?journeySteps(b):
    b.status==="Delivered"?`<div class="panel" style="margin-top:12px;background:#eef9f3"><b>✓ Delivery Complete</b><p class="muted">Pickup and delivery evidence is available to Admin and Client.</p></div>`:
    `<p class="muted">Waiting for next stage.</p>`}
  <details style="margin-top:12px"><summary><b>Journey Timeline</b></summary>
   ${(b.timeline||[]).map(e=>`<div class="event"><b>${e.title}</b><div class="muted">${e.text}</div></div>`).join("")||"<p class='muted'>No timeline events yet.</p>"}
  </details>
 </div>`;
}
function drawDriverJobsMobile(){
 const rows=driverAssignedRows();
 const live=rows.filter(b=>b.status!=="Delivered");
 return `<div class="driverSectionTitle"><h3 style="margin:0">My Jobs</h3><span class="driverPill">${live.length} active</span></div>
 ${live.length?live.map(driverMobileJobCard).join(""):`<div class="driverEmpty">No active jobs assigned.</div>`}`;
}
function drawDriverHolidaysMobile(){
 const s=ensureHRData(),name=currentUser?.name||currentStaffUser?.name||"Driver";
 const my=(s.holidays||[]).filter(h=>h.name===name).slice().reverse();
 return `<div class="driverSectionTitle"><h3 style="margin:0">Holiday Requests</h3></div>
 <div class="driverHolidayCard">
  <div class="form">
   <input id="drvHolFrom" type="date">
   <input id="drvHolTo" type="date">
   <select id="drvHolType"><option>Annual Leave</option><option>Unpaid Leave</option><option>Emergency Leave</option><option>Other</option></select>
   <textarea id="drvHolNotes" class="full" placeholder="Reason / notes"></textarea>
  </div>
  <div class="actions"><button class="btn primary" onclick="submitDriverHolidayRequest()">Submit Request</button></div>
 </div>
 <h4>My Requests</h4>
 ${my.length?my.map(h=>`<div class="driverHolidayCard"><b>${h.from} → ${h.to}</b><div class="muted">${h.type}</div><div style="margin-top:8px"><span class="badge ${h.status==="Approved"?"green":h.status==="Rejected"?"red":"amber"}">${h.status}</span></div></div>`).join(""):`<div class="driverEmpty">No holiday requests yet.</div>`}`;
}
function drawDriverHistoryMobile(){
 const rows=driverAssignedRows().filter(b=>b.status==="Delivered").slice().reverse();
 return `<div class="driverSectionTitle"><h3 style="margin:0">Delivered History</h3><span class="driverPill">${rows.length}</span></div>
 ${rows.length?rows.map(b=>`<div class="driverJob"><div style="display:flex;justify-content:space-between"><b>${b.ref}</b><span class="badge green">Delivered</span></div><h3>${b.vehicle||"Vehicle"} ${b.reg||""}</h3><div class="driverRoute">${b.pickup||"—"} → ${b.destination||"—"}</div><p><b>Delivered:</b> ${b.deliveryEvidence?.deliveredAt?new Date(b.deliveryEvidence.deliveredAt).toLocaleString():(b.deliveryDate||"—")}</p><button class="btn secondary" onclick="showEvidence('${b.ref}')">View Evidence</button></div>`).join(""):`<div class="driverEmpty">No delivered jobs yet.</div>`}`;
}
function drawDriverProfileMobile(){
 const name=currentUser?.name||currentStaffUser?.name||"Driver";
 const s=ensureStaffUsers();
 const u=(s.staffUsers||[]).find(x=>x.name===name)||{};
 return `<div class="driverSectionTitle"><h3 style="margin:0">Driver Profile</h3></div>
 <div class="driverProfileCard">
  <h2 style="margin-top:0">${name}</h2>
  <p><b>Email:</b> ${u.email||"driver@ukonwheels.co.uk"}</p>
  <p><b>Mobile:</b> ${u.phone||"—"}</p>
  <p><b>Driving Licence:</b> ${u.drivingLicenceNo||"—"}</p>
  <p><b>Licence Type:</b> ${u.licenceType||"—"}</p>
  <p><b>DVLA Expiry:</b> ${u.dvlaExpiry||"—"}</p>
  <p><b>Safety Certificate:</b> ${u.safetyCertificate||"—"}</p>
  <p><b>Status:</b> <span class="badge ${u.status==="Inactive"?"red":"green"}">${u.status||"Active"}</span></p>
  <div class="actions"><button class="btn secondary" onclick="location.reload()">Logout</button></div>
 </div>`;
}
function drawDriver(c){
 document.body.classList.add("driver-mode");
 const rows=driverAssignedRows(),counts=driverStatusCounts(rows),name=currentUser?.name||currentStaffUser?.name||"Driver";
 let body="";
 if(driverMobileTab==="jobs")body=drawDriverJobsMobile();
 else if(driverMobileTab==="holidays")body=drawDriverHolidaysMobile();
 else if(driverMobileTab==="history")body=drawDriverHistoryMobile();
 else body=drawDriverProfileMobile();

 c.innerHTML=`<div class="driverApp">
  <div class="driverHeader">
   <small>UK ON WHEELS DRIVER</small>
   <h2>Hello, ${name}</h2>
   <div class="driverSummary">
    <div><strong>${counts.assigned}</strong><small>Assigned</small></div>
    <div><strong>${counts.active}</strong><small>Active</small></div>
    <div><strong>${counts.delivered}</strong><small>Delivered</small></div>
   </div>
  </div>
  <div class="driverBody">${body}</div>
  ${driverMobileNav()}
 </div>`;
}
function driverCard(b){
 return `<div class="panel"><div><span class="badge">${b.status}</span></div><h2>${b.ref} — ${b.vehicle}</h2><p><b>${b.pickup}</b> → <b>${b.destination}</b></p>
 ${b.status==="Driver Assigned"?pickupSteps(b):b.status==="Picked Up"?onRouteSteps(b):b.status==="On Route"||["Delayed","Accident","Fault On Route","Assigned AA on Route"].includes(b.status)?journeySteps(b):b.status==="Delivered"?`<div class="badge green">✓ Delivered</div>`:"<p class='muted'>Waiting for next stage.</p>"}
 <h3>Journey Timeline</h3>${(b.timeline||[]).map(e=>`<div class="event"><b>${e.title}</b><div class="muted">${e.text}</div></div>`).join("")}</div>`;
}
function pickupSteps(b){
 const names=["Front","Rear","Left Side","Right Side","Interior Front","Interior Rear","Dashboard / Mileage","Existing Damage (optional)"];
 return `<div class="step"><h4>1. Ready to Pickup</h4><label><input type="checkbox" id="ready_${b.ref}"> Ready to Pickup</label></div>
 <div class="step"><h4>2. Live Vehicle Camera</h4>
 <p class="muted"><b>Camera only:</b> gallery/saved photo upload is disabled. Each photo is captured live and stamped with date, time and GPS location.</p>
 <div class="grid2">${names.map((x,i)=>cameraSlot(b.ref,i,x)).join("")}</div></div>
 <div class="step"><h4>3. Documents & Items — Live Camera</h4>
 <p class="muted">Logbook/V5C, keys, service history, mats and other items are recorded through the live camera.</p>
 <div class="grid2">${["Logbook / V5C","Keys","Service History Book","Mats","Other Documents / Items"].map((x,i)=>cameraSlot(b.ref,"d"+i,x)).join("")}</div></div>
 <div class="step"><h4>4. Driver Declaration</h4><label><input type="checkbox" id="dec_${b.ref}"> I declare that I have received the vehicle with the listed documents/items and that the vehicle condition is accurately shown in the live photographs. I accept responsibility for changes or damage after pickup.</label></div>
 <button class="btn primary" onclick="completePickup('${b.ref}')">Picked Up</button>`;
}
function cameraSlot(ref,id,label){
 return `<div class="cameraBox">
   <b>${label}</b>
   <video id="v_${ref}_${id}" playsinline autoplay></video>
   <canvas id="c_${ref}_${id}"></canvas>
   <div class="camActions">
     <button class="btn secondary" onclick="startCamera('${ref}','${id}')">Open Camera</button>
     <button class="btn primary" onclick="captureCamera('${ref}','${id}')">Take Photo</button>
   </div>
   <div class="captureMeta" id="s_${ref}_${id}">Not captured</div>
 </div>`;
}
const cameraStreams={};
async function startCamera(ref,id){
 try{
   const video=document.getElementById(`v_${ref}_${id}`);
   if(cameraStreams[ref+"_"+id]) cameraStreams[ref+"_"+id].getTracks().forEach(t=>t.stop());
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
   cameraStreams[ref+"_"+id]=stream;
   video.srcObject=stream;
   video.style.display="block";
   await video.play();
 }catch(e){
   alert("Camera access is required. Please allow camera permission.");
 }
}
async function captureCamera(ref,id){
 const video=document.getElementById(`v_${ref}_${id}`);
 const canvas=document.getElementById(`c_${ref}_${id}`);
 if(!video.srcObject){alert("Open the live camera first.");return}

 let latitude=null,longitude=null,accuracy=null;
 try{
   const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:10000,maximumAge:0}));
   latitude=p.coords.latitude; longitude=p.coords.longitude; accuracy=p.coords.accuracy;
 }catch(e){
   alert("Location permission is required so the photo can record where it was taken.");
   return;
 }

 const now=new Date();
 const dateText=now.toLocaleDateString("en-GB");
 const timeText=now.toLocaleTimeString("en-GB",{hour12:false});
 const locationText=`GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} ±${Math.round(accuracy)}m`;

 canvas.width=video.videoWidth||1280;
 canvas.height=video.videoHeight||720;
 const ctx=canvas.getContext("2d");
 ctx.drawImage(video,0,0,canvas.width,canvas.height);

 const fontSize=Math.max(18,Math.round(canvas.width/45));
 const pad=Math.max(14,Math.round(canvas.width/80));
 const line=Math.round(fontSize*1.35);
 const stripH=line*3+pad*2;
 ctx.fillStyle="rgba(0,0,0,0.72)";
 ctx.fillRect(0,canvas.height-stripH,canvas.width,stripH);
 ctx.fillStyle="#fff";
 ctx.font=`bold ${fontSize}px Arial`;
 ctx.fillText("UK ON WHEELS — LIVE PICKUP EVIDENCE",pad,canvas.height-stripH+pad+fontSize);
 ctx.font=`${fontSize}px Arial`;
 ctx.fillText(`${dateText} ${timeText}`,pad,canvas.height-stripH+pad+fontSize+line);
 ctx.fillText(locationText,pad,canvas.height-stripH+pad+fontSize+line*2);

 canvas.style.display="block";
 const status=document.getElementById(`s_${ref}_${id}`);
 status.innerHTML=`Live photo captured<br>${dateText} ${timeText}<br>${locationText}`;
 status.dataset.captured="1";
 status.dataset.timestamp=now.toISOString();
 status.dataset.latitude=latitude;
 status.dataset.longitude=longitude;
 status.dataset.accuracy=accuracy;

 // Persist a compressed evidence image so Admin and Client can view it later.
 try{
   let s=getStore(),b=s.bookings.find(x=>x.ref===ref);
   if(b){
     b.pickupPhotos=b.pickupPhotos||{};
     b.pickupPhotos[String(id)]={
       image:canvas.toDataURL("image/jpeg",0.58),
       timestamp:now.toISOString(),
       dateText,timeText,
       latitude,longitude,accuracy,
       label:(document.querySelector(`#s_${CSS.escape(ref)}_${CSS.escape(String(id))}`)?.closest(".cameraBox")?.querySelector("b")?.textContent)||String(id)
     };
     saveStore(s);
   }
 }catch(e){console.warn("Could not persist pickup photo",e)}

 const key=ref+"_"+id;
 if(cameraStreams[key]){cameraStreams[key].getTracks().forEach(t=>t.stop());delete cameraStreams[key]}
 video.style.display="none";
}
function completePickup(ref){
 let s=getStore(),b=s.bookings.find(x=>x.ref===ref);
 if(!document.getElementById("ready_"+ref).checked)return alert("Confirm Ready to Pickup.");
 for(let i=0;i<7;i++){
   if(document.getElementById(`s_${ref}_${i}`).dataset.captured!=="1")
     return alert("Please take all required vehicle photographs live with the camera.");
 }
 if(document.getElementById(`s_${ref}_d1`).dataset.captured!=="1")
   return alert("Please take a live photo of the vehicle keys.");
 if(!document.getElementById("dec_"+ref).checked)return alert("Accept the driver declaration.");

 b.status="Picked Up";
 b.pickupCaptureMode="Live Camera + Timestamp + GPS";
 b.pickupCapturedAt=new Date().toISOString();
 b.pickupEvidence={
   requiredPhotos:7,
   keysCaptured:true,
   declaration:true,
   driver:b.driver,
   bookingRef:b.ref
 };
 b.timeline.unshift({title:"Picked Up",text:"Live camera pickup evidence, timestamp, GPS and declaration completed at "+new Date().toLocaleString()});
 s.notifications.unshift({title:"Picked Up",text:b.ref+" has been picked up by "+b.driver+" with live camera and GPS evidence."});
 saveStore(s);
 draw();
}function onRouteSteps(b){return `<div class="step"><h4>Start Journey</h4><button class="btn primary" onclick="startJourney('${b.ref}')">Start Journey — On Route</button></div>`}
function startJourney(ref){let s=getStore(),b=s.bookings.find(x=>x.ref===ref);b.status="On Route";b.timeline.unshift({title:"On Route",text:"Journey started at "+new Date().toLocaleString()});saveStore(s);queueCustomerStatusMessage(b,"onRoute");draw()}
function journeySteps(b){
 const deliveryPhotos=["Front at Delivery","Rear at Delivery","Left Side at Delivery","Right Side at Delivery","Interior at Delivery","Dashboard / Mileage at Delivery"];
 return `<div class="grid2"><button class="btn warn" onclick="incident('${b.ref}','Delayed')">Report Delay</button><button class="btn warn" onclick="incident('${b.ref}','Fault On Route')">Vehicle Fault</button><button class="btn danger" onclick="incident('${b.ref}','Accident')">Accident</button><button class="btn secondary" onclick="incident('${b.ref}','Assigned AA on Route')">AA Assistance</button></div>
 <div class="step"><h4>Delivery Evidence — Live Camera</h4><p class="muted">Take live delivery photographs before handover.</p>
 <div class="grid2">${deliveryPhotos.map((x,i)=>deliveryCameraSlot(b.ref,i,x)).join("")}</div></div>
 <div class="step"><h4>Receiver & Driver Signatures</h4>
  <input id="rn_${b.ref}" value="${b.receiver||""}" placeholder="Person receiving vehicle">
  <input id="rm_${b.ref}" value="${b.receiverMobile||""}" placeholder="Receiver mobile">
  <label><b>Receiver Signature</b></label><canvas class="signaturePad" id="receiverSig_${b.ref}"></canvas>
  <div class="actions"><button class="btn secondary" onclick="clearSignature('receiverSig_${b.ref}')">Clear Receiver Signature</button></div>
  <label><b>Driver Signature</b></label><canvas class="signaturePad" id="driverSig_${b.ref}"></canvas>
  <div class="actions"><button class="btn secondary" onclick="clearSignature('driverSig_${b.ref}')">Clear Driver Signature</button></div>
  <label><input type="checkbox" id="dc_${b.ref}"> Vehicle handed over to receiver</label>
  <button class="btn primary" onclick="deliver('${b.ref}')">Mark Delivered</button>
 </div>
 <script>setTimeout(()=>{initSignaturePad('receiverSig_${b.ref}');initSignaturePad('driverSig_${b.ref}')},0)<\/script>`;
}

function deliveryCameraSlot(ref,id,label){
 return `<div class="cameraBox">
  <b>${label}</b>
  <video id="dv_${ref}_${id}" playsinline autoplay></video>
  <canvas id="dcv_${ref}_${id}"></canvas>
  <div class="camActions">
   <button class="btn secondary" onclick="startDeliveryCamera('${ref}','${id}')">Open Camera</button>
   <button class="btn primary" onclick="captureDeliveryCamera('${ref}','${id}')">Take Photo</button>
  </div>
  <div class="captureMeta" id="ds_${ref}_${id}">Not captured</div>
 </div>`;
}
async function startDeliveryCamera(ref,id){
 try{
  const video=document.getElementById(`dv_${ref}_${id}`);
  const key="delivery_"+ref+"_"+id;
  if(cameraStreams[key])cameraStreams[key].getTracks().forEach(t=>t.stop());
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
  cameraStreams[key]=stream;video.srcObject=stream;video.style.display="block";await video.play();
 }catch(e){alert("Camera access is required for delivery evidence.");}
}
async function captureDeliveryCamera(ref,id){
 const video=document.getElementById(`dv_${ref}_${id}`),canvas=document.getElementById(`dcv_${ref}_${id}`),status=document.getElementById(`ds_${ref}_${id}`);
 if(!video?.srcObject)return alert("Open the live camera first.");
 let latitude=null,longitude=null,accuracy=null;
 try{
  const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:10000,maximumAge:0}));
  latitude=p.coords.latitude;longitude=p.coords.longitude;accuracy=p.coords.accuracy;
 }catch(e){return alert("Location permission is required for delivery evidence.");}
 const now=new Date(),dateText=now.toLocaleDateString("en-GB"),timeText=now.toLocaleTimeString("en-GB",{hour12:false});
 canvas.width=video.videoWidth||1280;canvas.height=video.videoHeight||720;
 const ctx=canvas.getContext("2d");ctx.drawImage(video,0,0,canvas.width,canvas.height);
 const fs=Math.max(18,Math.round(canvas.width/45)),pad=14,line=Math.round(fs*1.35),strip=line*3+pad*2;
 ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(0,canvas.height-strip,canvas.width,strip);
 ctx.fillStyle="#fff";ctx.font=`bold ${fs}px Arial`;ctx.fillText("UK ON WHEELS — LIVE DELIVERY EVIDENCE",pad,canvas.height-strip+pad+fs);
 ctx.font=`${fs}px Arial`;ctx.fillText(`${dateText} ${timeText}`,pad,canvas.height-strip+pad+fs+line);
 ctx.fillText(`GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} ±${Math.round(accuracy)}m`,pad,canvas.height-strip+pad+fs+line*2);
 canvas.style.display="block";status.dataset.captured="1";status.innerHTML=`Captured<br>${dateText} ${timeText}`;
 let s=getStore(),b=s.bookings.find(x=>x.ref===ref);
 if(b){
  b.deliveryPhotos=b.deliveryPhotos||{};
  b.deliveryPhotos[String(id)]={image:canvas.toDataURL("image/jpeg",0.58),timestamp:now.toISOString(),dateText,timeText,latitude,longitude,accuracy,label:status.closest(".cameraBox")?.querySelector("b")?.textContent||String(id)};
  saveStore(s);
 }
 const key="delivery_"+ref+"_"+id;if(cameraStreams[key]){cameraStreams[key].getTracks().forEach(t=>t.stop());delete cameraStreams[key]}video.style.display="none";
}
const signaturePads={};
function initSignaturePad(id){
 const canvas=document.getElementById(id);if(!canvas||signaturePads[id])return;
 canvas.width=canvas.clientWidth*2||700;canvas.height=300;
 const ctx=canvas.getContext("2d");ctx.scale(2,2);ctx.lineWidth=2;ctx.lineCap="round";
 let drawing=false,last=null;
 const point=e=>{const r=canvas.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return{x:p.clientX-r.left,y:p.clientY-r.top}};
 const start=e=>{drawing=true;last=point(e);canvas.dataset.signed="1";e.preventDefault()};
 const move=e=>{if(!drawing)return;const p=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault()};
 const stop=e=>{drawing=false;e.preventDefault()};
 canvas.addEventListener("mousedown",start);canvas.addEventListener("mousemove",move);window.addEventListener("mouseup",stop);
 canvas.addEventListener("touchstart",start,{passive:false});canvas.addEventListener("touchmove",move,{passive:false});canvas.addEventListener("touchend",stop,{passive:false});
 signaturePads[id]=true;
}
function clearSignature(id){const c=document.getElementById(id);if(!c)return;const ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);c.dataset.signed="";}
function incident(ref,status){let note=prompt("Add location / notes for "+status,"");let s=getStore(),b=s.bookings.find(x=>x.ref===ref);b.status=status;b.timeline.unshift({title:status,text:(note||"No notes")+" · "+new Date().toLocaleString()});s.notifications.unshift({title:status,text:b.ref+" updated to "+status+"."});saveStore(s);draw()}
function deliver(ref){
 let s=getStore(),b=s.bookings.find(x=>x.ref===ref);
 if(!b)return;
 for(let i=0;i<6;i++){
  if(document.getElementById(`ds_${ref}_${i}`)?.dataset.captured!=="1")return alert("Please take all required delivery photographs.");
 }
 if(!document.getElementById("dc_"+ref)?.checked)return alert("Confirm vehicle handover.");
 const receiverCanvas=document.getElementById("receiverSig_"+ref),driverCanvas=document.getElementById("driverSig_"+ref);
 if(receiverCanvas?.dataset.signed!=="1")return alert("Receiver signature is required.");
 if(driverCanvas?.dataset.signed!=="1")return alert("Driver signature is required.");
 b.status="Delivered";
 b.receiver=document.getElementById("rn_"+ref)?.value||b.receiver;
 b.receiverMobile=document.getElementById("rm_"+ref)?.value||b.receiverMobile;
 b.deliveryCapturedAt=new Date().toISOString();
 b.deliveryEvidence=b.deliveryEvidence||{};
 b.deliveryEvidence.receiverName=b.receiver;
 b.deliveryEvidence.receiverMobile=b.receiverMobile;
 b.deliveryEvidence.receiverSignature=receiverCanvas.toDataURL("image/png");
 b.deliveryEvidence.driverSignature=driverCanvas.toDataURL("image/png");
 b.deliveryEvidence.driver=b.driver;
 b.deliveryEvidence.deliveredAt=b.deliveryCapturedAt;
 if(!b.paymentStatus)b.paymentStatus="Pending";
 b.timeline.unshift({title:"Delivered",text:"Vehicle delivered with delivery photographs, receiver signature and driver signature at "+new Date().toLocaleString()});
 s.notifications.unshift({title:"Delivered",text:b.ref+" has been delivered with signed delivery evidence."});
 saveStore(s);queueCustomerStatusMessage(b,"delivered");draw();
}
window.addEventListener("storage",()=>{if(!app.classList.contains("hidden"))draw()});
window.addEventListener("ukowupdate",()=>{if(!app.classList.contains("hidden"))draw()});
</script>
</body>
</html>
