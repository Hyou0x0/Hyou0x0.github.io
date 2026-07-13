
import{initializeApp}from"https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";import{getAuth,onAuthStateChanged,signInAnonymously}from"https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";import{getDatabase,ref,push,set,update,remove,onValue,serverTimestamp}from"https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";import{firebaseConfig}from"./firebase-config.js";
const S={USER:"futariTodo.user.v2",FILTER:"futariTodo.filter.v2",COLLAPSED:"futariTodo.collapsed.v2",CACHE:"futariTodo.cache.v2",MIGRATED:"futariTodo.firestoreMigrated.v1"},GAP=1024,USERS=new Set(["まさぴ","ゆなぴ"]),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const e={status:q("#syncStatus"),chooser:q("#userChooser"),change:q("#changeUserButton"),recover:q("#recoverButton"),filters:qa("[data-filter]"),active:q("#activeList"),done:q("#completedList"),activeCount:q("#activeCount"),doneCount:q("#completedCount"),activeEmpty:q("#activeEmpty"),doneEmpty:q("#completedEmpty"),toggle:q("#completedToggle"),doneBody:q("#completedBody"),chevron:q("#completedChevron"),form:q("#todoForm"),input:q("#todoInput"),add:q("#addButton"),template:q("#todoTemplate")};
let firebaseApp=null;const valid=v=>USERS.has(v)?v:"";const st={user:valid(localStorage.getItem(S.USER)),filter:(()=>{const f=localStorage.getItem(S.FILTER)||"all";return["まさぴ","ゆなぴ"].includes(f)?"all":f})(),collapsed:localStorage.getItem(S.COLLAPSED)==="1",todos:new Map,db:null,authUser:null,connected:false,sortA:null,sortD:null};
function status(t,s){e.status.textContent=t;e.status.dataset.state=s}function norm(id,v={}){return{id,text:String(v.text||"").slice(0,160),done:!!v.done,important:!!v.important,author:USERS.has(v.author)?v.author:"不明",order:Number.isFinite(+v.order)?+v.order:0,createdAt:+v.createdAt||0}}function cache(){try{localStorage.setItem(S.CACHE,JSON.stringify([...st.todos.values()]))}catch{}}function load(){try{const raw=localStorage.getItem(S.CACHE)||localStorage.getItem("todoCache_v1")||localStorage.getItem("futariTodo.cache.v1")||"[]";const a=JSON.parse(raw);if(Array.isArray(a))for(const x of a)if(x?.id)st.todos.set(x.id,norm(x.id,x));if(st.todos.size)status("前回のリストを表示中","loading")}catch{}}
function otherUser(){return st.user==="まさぴ"?"ゆなぴ":st.user==="ゆなぴ"?"まさぴ":""}
function list(done){return[...st.todos.values()].filter(x=>x.done===done).filter(x=>{if(st.filter==="all")return true;if(st.filter==="important")return x.important;if(st.filter==="self")return !!st.user&&x.author===st.user;if(st.filter==="other")return !!otherUser()&&x.author===otherUser();return true}).sort((a,b)=>a.order-b.order||a.createdAt-b.createdAt)}
function render(){e.filters.forEach(b=>b.classList.toggle("active",b.dataset.filter===st.filter));e.chooser.hidden=!!st.user;e.input.disabled=e.add.disabled=!st.user;e.doneBody.hidden=st.collapsed;e.chevron.textContent=st.collapsed?"▸":"▾";const a=list(false),d=list(true);patch(e.active,a);patch(e.done,d);e.activeCount.textContent=a.length;e.doneCount.textContent=d.length;e.activeEmpty.hidden=!!a.length;e.doneEmpty.hidden=!!d.length;sortables()}
function patch(ul,items){const old=new Map([...ul.children].map(n=>[n.dataset.id,n.getBoundingClientRect()])),want=new Set(items.map(x=>x.id));[...ul.children].forEach(n=>{if(!want.has(n.dataset.id))n.remove()});items.forEach((x,i)=>{let n=ul.querySelector(`[data-id="${CSS.escape(x.id)}"]`);if(!n)n=create(x);else updateRow(n,x);const at=ul.children[i];if(at!==n)ul.insertBefore(n,at||null)});requestAnimationFrame(()=>[...ul.children].forEach(n=>{const o=old.get(n.dataset.id);if(!o)return;const y=o.top-n.getBoundingClientRect().top;if(y)n.animate([{transform:`translateY(${y}px)`},{transform:"translateY(0)"}],{duration:210,easing:"cubic-bezier(.2,.8,.2,1)"})}))}
function create(x){const n=e.template.content.firstElementChild.cloneNode(true);n.dataset.id=x.id;n.querySelector(".todo-check").addEventListener("change",ev=>done(x.id,ev.target.checked));n.querySelector(".todo-content").addEventListener("click",()=>{if(n.dataset.suppressClick==="1")return;done(x.id,!st.todos.get(x.id)?.done)});n.querySelector(".important-button").addEventListener("click",()=>important(x.id));swipe(n,x.id);updateRow(n,x);return n}function updateRow(n,x){n.dataset.author=x.author;n.classList.toggle("is-done",x.done);n.querySelector(".todo-check").checked=x.done;n.querySelector(".todo-text").textContent=x.text;n.querySelector(".author-badge").textContent=x.author;const b=n.querySelector(".important-button");b.textContent=x.important?"★":"☆";b.classList.toggle("is-important",x.important)}
function sortables(){if(!window.Sortable)return;if(!st.sortA)st.sortA=new Sortable(e.active,{animation:180,handle:".drag-handle",delay:0,touchStartThreshold:2,ghostClass:"todo-ghost",chosenClass:"todo-chosen",dragClass:"todo-dragging",onEnd:v=>move(e.active,v.item.dataset.id)});if(!st.sortD)st.sortD=new Sortable(e.done,{animation:180,handle:".drag-handle",delay:0,touchStartThreshold:2,ghostClass:"todo-ghost",chosenClass:"todo-chosen",dragClass:"todo-dragging",onEnd:v=>move(e.done,v.item.dataset.id)})}
async function move(ul,id){if(!st.db)return;const ids=[...ul.children].map(n=>n.dataset.id),i=ids.indexOf(id),p=i>0?st.todos.get(ids[i-1]):null,n=i<ids.length-1?st.todos.get(ids[i+1]):null;let order=!p&&!n?GAP:!p?n.order-GAP:!n?p.order+GAP:(p.order+n.order)/2;st.todos.get(id).order=order;cache();try{await update(ref(st.db,`todos/${id}`),{order})}catch{status("並び替え保存に失敗","offline")}}
function next(done){const a=[...st.todos.values()].filter(x=>x.done===done);return a.length?Math.max(...a.map(x=>x.order||0))+GAP:GAP}
async function add(text){const r=push(ref(st.db,"todos")),v={text,done:false,important:false,author:st.user,order:next(false),createdAt:Date.now(),updatedAt:serverTimestamp(),createdBy:st.authUser.uid};st.todos.set(r.key,norm(r.key,v));cache();render();try{await set(r,v)}catch(err){st.todos.delete(r.key);cache();render();throw err}}
async function done(id,val){const x=st.todos.get(id);if(!x||!st.db)return;const old={...x};x.done=val;x.order=next(val);cache();render();try{await update(ref(st.db,`todos/${id}`),{done:val,order:x.order,updatedAt:serverTimestamp()})}catch{st.todos.set(id,old);cache();render();status("更新失敗","offline")}}
async function important(id){const x=st.todos.get(id);if(!x)return;const old=x.important;x.important=!old;cache();render();try{await update(ref(st.db,`todos/${id}`),{important:x.important,updatedAt:serverTimestamp()})}catch{x.important=old;cache();render()}}
async function del(id){const x=st.todos.get(id);if(!x)return;st.todos.delete(id);cache();render();try{await remove(ref(st.db,`todos/${id}`))}catch{st.todos.set(id,x);cache();render();status("削除失敗","offline")}}
function swipe(row,id){let sx=0,sy=0,m=false,blocked=false;row.addEventListener("touchstart",v=>{blocked=!!v.target.closest(".drag-handle,.important-button,.todo-check");if(blocked)return;const t=v.touches[0];sx=t.clientX;sy=t.clientY;m=false;row.dataset.suppressClick="0"},{passive:true});row.addEventListener("touchmove",v=>{if(blocked)return;const t=v.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)<12||Math.abs(dx)<=Math.abs(dy))return;m=true;row.dataset.suppressClick="1";v.preventDefault();const clamped=Math.max(-95,Math.min(95,dx));row.style.transform=`translateX(${clamped}px)`;row.classList.toggle("swiping-left",clamped<0);row.classList.toggle("swiping-right",clamped>0)},{passive:false});row.addEventListener("touchend",v=>{if(blocked||!m)return;const dx=v.changedTouches[0].clientX-sx;row.style.transform="";row.classList.remove("swiping-left","swiping-right");setTimeout(()=>row.dataset.suppressClick="0",120);if(dx>65){const x=st.todos.get(id);if(x)done(id,!x.done)}else if(dx<-65)del(id)});row.addEventListener("touchcancel",()=>{row.style.transform="";row.classList.remove("swiping-left","swiping-right");row.dataset.suppressClick="0"})}
async function migrateFromFirestore(app,{force=false}={}){
  if((!force&&localStorage.getItem(S.MIGRATED)==="1")||!st.db||!st.authUser)return {ok:false,count:0,reason:"skipped"};
  const readField=f=>{
    if(!f)return null;
    if("stringValue"in f)return f.stringValue;
    if("booleanValue"in f)return f.booleanValue;
    if("integerValue"in f)return Number(f.integerValue);
    if("doubleValue"in f)return Number(f.doubleValue);
    if("timestampValue"in f)return Date.parse(f.timestampValue);
    if("nullValue"in f)return null;
    return null;
  };
  try{
    e.recover?.classList.add("is-busy");
    status("旧Firestoreを直接読み込み中","syncing");
    const token=await st.authUser.getIdToken(true);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    const url=`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/todos?pageSize=1000`;
    let response;
    try{
      response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:controller.signal});
    }finally{clearTimeout(timer)}
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      const code=payload?.error?.status||payload?.error?.message||`HTTP_${response.status}`;
      throw Object.assign(new Error(String(code)),{code});
    }
    const docs=Array.isArray(payload.documents)?payload.documents:[];
    if(!docs.length){status("旧Firestoreにタスクが見つかりません","offline");return {ok:true,count:0,reason:"empty"}}
    const updates={};let index=0;
    for(const doc of docs){
      const f=doc.fields||{};
      const id=decodeURIComponent(doc.name.split("/").pop());
      const authorName=readField(f.authorName)||readField(f.author);
      const priority=readField(f.priority);
      const important=priority==null?!!readField(f.important):!!priority;
      updates[`todos/${id}`]={
        text:String(readField(f.text)||"").slice(0,160),
        done:!!readField(f.done),
        important,
        author:USERS.has(authorName)?authorName:(st.user||"まさぴ"),
        order:Number.isFinite(+readField(f.order))?+readField(f.order):(index+1)*GAP,
        createdAt:+readField(f.createdAt)||Date.now()+index,
        updatedAt:Date.now(),
        createdBy:String(readField(f.authorUid)||st.authUser.uid)
      };
      index++;
    }
    await update(ref(st.db),updates);
    localStorage.setItem(S.MIGRATED,"1");
    status(`旧タスクを${index}件復元しました`,"online");
    return {ok:true,count:index,reason:"migrated"};
  }catch(err){
    console.error("Firestore REST migration failed",err);
    const code=err?.name==="AbortError"?"timeout":(err?.code||err?.name||"unknown");
    status(`旧データ復元失敗: ${code}`,"offline");
    return {ok:false,count:0,reason:code};
  }finally{e.recover?.classList.remove("is-busy")}
}
function connect(){
  if(firebaseConfig.databaseURL.includes("PASTE_YOUR")){status("databaseURLを設定してください","offline");return}
  firebaseApp=initializeApp(firebaseConfig);const auth=getAuth(firebaseApp);st.db=getDatabase(firebaseApp);
  onValue(ref(st.db,".info/connected"),snap=>{
    st.connected=snap.val()===true;
    status(st.connected?(st.user?`同期済み・${st.user}`:"同期済み"):"オフライン・端末キャッシュ",st.connected?"online":"offline");
  });
  onAuthStateChanged(auth,u=>{
    if(!u){status("同期を準備中","syncing");signInAnonymously(auth).catch(err=>{console.error(err);status(`匿名ログイン失敗: ${err.code||"unknown"}`,"offline")});return}
    st.authUser=u;let first=true;
    onValue(ref(st.db,"todos"),async snap=>{
      const o=snap.val()||{};
      if(first&&Object.keys(o).length===0&&localStorage.getItem(S.MIGRATED)!=="1"){
        first=false;
        const result=await migrateFromFirestore(firebaseApp);
        if(result.count>0)return;
        if(!result.ok){
          // 移行失敗時は既存キャッシュを空データで消さない
          render();
          return;
        }
      }
      first=false;
      const m=new Map;for(const[id,v]of Object.entries(o))m.set(id,norm(id,v));
      if(m.size===0&&st.todos.size>0){
        // 空のリモートで端末キャッシュを消さない
        status("クラウドは空です・端末キャッシュを表示","offline");
        render();
        return;
      }
      st.todos=m;cache();render();
      status(st.connected?(st.user?`同期済み・${st.user}`:"同期済み"):"オフライン・端末キャッシュ",st.connected?"online":"offline")
    },err=>{console.error(err);status(`同期データ取得失敗: ${err.code||"unknown"}`,"offline")})
  })
}
e.form.addEventListener("submit",async v=>{v.preventDefault();const t=e.input.value.trim();if(!t||!st.db||!st.user||!st.authUser)return;e.input.value="";try{await add(t)}catch{e.input.value=t}});qa("[data-user]").forEach(b=>b.addEventListener("click",()=>{st.user=valid(b.dataset.user);localStorage.setItem(S.USER,st.user);render();e.input.focus()}));e.change.addEventListener("click",()=>{st.user="";localStorage.removeItem(S.USER);render()});e.recover?.addEventListener("click",async()=>{if(e.recover.classList.contains("is-busy"))return;localStorage.removeItem(S.MIGRATED);const original=e.recover.textContent;e.recover.classList.add("is-busy");e.recover.textContent="…";let finished=false;const watchdog=setTimeout(()=>{if(finished)return;finished=true;e.recover.classList.remove("is-busy");e.recover.textContent=original;status("復元処理を20秒で停止しました","offline")},20000);try{if(!firebaseApp||!st.authUser){status("Firebase認証待ち","syncing");return}await migrateFromFirestore(firebaseApp,{force:true})}finally{if(!finished){finished=true;clearTimeout(watchdog);e.recover.classList.remove("is-busy");e.recover.textContent=original}}});e.filters.forEach(b=>b.addEventListener("click",()=>{st.filter=b.dataset.filter;localStorage.setItem(S.FILTER,st.filter);render()}));e.toggle.addEventListener("click",()=>{st.collapsed=!st.collapsed;localStorage.setItem(S.COLLAPSED,st.collapsed?"1":"0");render()});window.addEventListener("online",()=>status("再同期中","syncing"));window.addEventListener("offline",()=>status("オフライン・端末キャッシュ","offline"));if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});load();render();connect();
