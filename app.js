
import{initializeApp}from"https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";import{getAuth,onAuthStateChanged,signInAnonymously}from"https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";import{getDatabase,ref,push,set,update,remove,onValue,serverTimestamp}from"https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";import{firebaseConfig}from"./firebase-config.js?v=12";
const S={USER:"futariTodo.user.v2",FILTER:"futariTodo.filter.v2",COLLAPSED:"futariTodo.collapsed.v2",CACHE:"futariTodo.cache.v2"},GAP=1024,USERS=new Set(["まさぴ","ゆなぴ"]),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const e={status:q("#syncStatus"),chooser:q("#userChooser"),change:q("#changeUserButton"),filters:qa("[data-filter]"),active:q("#activeList"),done:q("#completedList"),activeCount:q("#activeCount"),doneCount:q("#completedCount"),activeEmpty:q("#activeEmpty"),doneEmpty:q("#completedEmpty"),toggle:q("#completedToggle"),doneBody:q("#completedBody"),chevron:q("#completedChevron"),form:q("#todoForm"),input:q("#todoInput"),add:q("#addButton"),template:q("#todoTemplate")};
let firebaseApp=null;const valid=v=>USERS.has(v)?v:"";const st={user:valid(localStorage.getItem(S.USER)),filter:(()=>{const f=localStorage.getItem(S.FILTER)||"all";return["まさぴ","ゆなぴ"].includes(f)?"all":f})(),collapsed:localStorage.getItem(S.COLLAPSED)==="1",todos:new Map,db:null,authUser:null,connected:false,serverLoaded:false,rescueAttempted:false,sortA:null,sortD:null};
function status(t,s){e.status.textContent=t;e.status.dataset.state=s}function norm(id,v={}){return{id,text:String(v.text||"").slice(0,160),done:!!v.done,important:!!v.important,author:USERS.has(v.author)?v.author:"不明",order:Number.isFinite(+v.order)?+v.order:0,createdAt:+v.createdAt||0}}function cache(){try{localStorage.setItem(S.CACHE,JSON.stringify([...st.todos.values()]))}catch{}}function load(){try{const raw=localStorage.getItem(S.CACHE)||localStorage.getItem("todoCache_v1")||localStorage.getItem("futariTodo.cache.v1")||"[]";const a=JSON.parse(raw);if(Array.isArray(a))for(const x of a)if(x?.id)st.todos.set(x.id,norm(x.id,x));if(st.todos.size)status(`端末内の${st.todos.size}件を表示中`,"loading")}catch{}return st.todos.size}
function otherUser(){return st.user==="まさぴ"?"ゆなぴ":st.user==="ゆなぴ"?"まさぴ":""}
function list(done){return[...st.todos.values()].filter(x=>x.done===done).filter(x=>{if(st.filter==="all")return true;if(st.filter==="important")return x.important;if(st.filter==="self")return !!st.user&&x.author===st.user;if(st.filter==="other")return !!otherUser()&&x.author===otherUser();return true}).sort((a,b)=>a.order-b.order||a.createdAt-b.createdAt)}
function render(){e.filters.forEach(b=>b.classList.toggle("active",b.dataset.filter===st.filter));e.chooser.hidden=!!st.user;e.input.disabled=e.add.disabled=!st.user;e.doneBody.hidden=st.collapsed;e.chevron.textContent=st.collapsed?"▸":"▾";const a=list(false),d=list(true);patch(e.active,a);patch(e.done,d);e.activeCount.textContent=a.length;e.doneCount.textContent=d.length;e.activeEmpty.hidden=!!a.length;e.doneEmpty.hidden=!!d.length;sortables()}
function patch(ul,items){const old=new Map([...ul.children].map(n=>[n.dataset.id,n.getBoundingClientRect()])),want=new Set(items.map(x=>x.id));[...ul.children].forEach(n=>{if(!want.has(n.dataset.id))n.remove()});items.forEach((x,i)=>{let n=ul.querySelector(`[data-id="${CSS.escape(x.id)}"]`);if(!n)n=create(x);else updateRow(n,x);const at=ul.children[i];if(at!==n)ul.insertBefore(n,at||null)});requestAnimationFrame(()=>[...ul.children].forEach(n=>{const o=old.get(n.dataset.id);if(!o)return;const y=o.top-n.getBoundingClientRect().top;if(y)n.animate([{transform:`translateY(${y}px)`},{transform:"translateY(0)"}],{duration:210,easing:"cubic-bezier(.2,.8,.2,1)"})}))}
function create(x){const n=e.template.content.firstElementChild.cloneNode(true);n.dataset.id=x.id;n.querySelector(".todo-check").addEventListener("change",ev=>done(x.id,ev.target.checked));n.querySelector(".todo-content").addEventListener("click",()=>{if(n.dataset.suppressClick==="1")return;done(x.id,!st.todos.get(x.id)?.done)});n.querySelector(".important-button").addEventListener("click",()=>important(x.id));swipe(n,x.id);updateRow(n,x);return n}function updateRow(n,x){n.dataset.author=x.author;n.classList.toggle("is-done",x.done);n.querySelector(".todo-check").checked=x.done;n.querySelector(".todo-text").textContent=x.text;n.querySelector(".author-badge").textContent=x.author;const b=n.querySelector(".important-button");b.textContent=x.important?"★":"☆";b.classList.toggle("is-important",x.important)}
function sortables(){if(!window.Sortable)return;if(!st.sortA)st.sortA=new Sortable(e.active,{animation:180,handle:".drag-handle",delay:0,touchStartThreshold:2,ghostClass:"todo-ghost",chosenClass:"todo-chosen",dragClass:"todo-dragging",onEnd:v=>move(e.active,v.item.dataset.id)});if(!st.sortD)st.sortD=new Sortable(e.done,{animation:180,handle:".drag-handle",delay:0,touchStartThreshold:2,ghostClass:"todo-ghost",chosenClass:"todo-chosen",dragClass:"todo-dragging",onEnd:v=>move(e.done,v.item.dataset.id)})}
async function move(ul,id){if(!st.db)return;const ids=[...ul.children].map(n=>n.dataset.id),i=ids.indexOf(id),p=i>0?st.todos.get(ids[i-1]):null,n=i<ids.length-1?st.todos.get(ids[i+1]):null;let order=!p&&!n?GAP:!p?n.order-GAP:!n?p.order+GAP:(p.order+n.order)/2;st.todos.get(id).order=order;cache();try{await update(ref(st.db,`todos/${id}`),{order})}catch{status("並び替え保存に失敗","offline")}}
function next(done){const a=[...st.todos.values()].filter(x=>x.done===done);return a.length?Math.max(...a.map(x=>x.order||0))+GAP:GAP}
async function add(text){
  const r=push(ref(st.db,"todos"));
  const v={text,done:false,important:false,author:st.user,order:next(false),createdAt:Date.now(),updatedAt:serverTimestamp(),createdBy:st.authUser.uid};
  st.todos.set(r.key,norm(r.key,v));cache();render();status("保存中","syncing");
  try{
    await set(r,v);
    status(`保存済み・共有${st.todos.size}件`,"online");
  }catch(err){
    st.todos.delete(r.key);cache();render();showFatal("タスク保存失敗",err);throw err;
  }
}
async function done(id,val){const x=st.todos.get(id);if(!x||!st.db)return;const old={...x};x.done=val;x.order=next(val);cache();render();try{await update(ref(st.db,`todos/${id}`),{done:val,order:x.order,updatedAt:serverTimestamp()})}catch{st.todos.set(id,old);cache();render();status("更新失敗","offline")}}
async function important(id){const x=st.todos.get(id);if(!x)return;const old=x.important;x.important=!old;cache();render();try{await update(ref(st.db,`todos/${id}`),{important:x.important,updatedAt:serverTimestamp()})}catch{x.important=old;cache();render()}}
async function del(id){const x=st.todos.get(id);if(!x)return;st.todos.delete(id);cache();render();try{await remove(ref(st.db,`todos/${id}`))}catch{st.todos.set(id,x);cache();render();status("削除失敗","offline")}}
function swipe(row,id){let sx=0,sy=0,m=false,blocked=false;row.addEventListener("touchstart",v=>{blocked=!!v.target.closest(".drag-handle,.important-button,.todo-check");if(blocked)return;const t=v.touches[0];sx=t.clientX;sy=t.clientY;m=false;row.dataset.suppressClick="0"},{passive:true});row.addEventListener("touchmove",v=>{if(blocked)return;const t=v.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)<12||Math.abs(dx)<=Math.abs(dy))return;m=true;row.dataset.suppressClick="1";v.preventDefault();const clamped=Math.max(-95,Math.min(95,dx));row.style.transform=`translateX(${clamped}px)`;row.classList.toggle("swiping-left",clamped<0);row.classList.toggle("swiping-right",clamped>0)},{passive:false});row.addEventListener("touchend",v=>{if(blocked||!m)return;const dx=v.changedTouches[0].clientX-sx;row.style.transform="";row.classList.remove("swiping-left","swiping-right");setTimeout(()=>row.dataset.suppressClick="0",120);if(dx>65){const x=st.todos.get(id);if(x)done(id,!x.done)}else if(dx<-65)del(id)});row.addEventListener("touchcancel",()=>{row.style.transform="";row.classList.remove("swiping-left","swiping-right");row.dataset.suppressClick="0"})}

async function rescueLocalTodos(){
  if(st.rescueAttempted||!st.db||!st.authUser||st.todos.size===0)return false;
  st.rescueAttempted=true;

  const payload={};
  let count=0;
  for(const item of st.todos.values()){
    if(!item.id||!item.text||!USERS.has(item.author))continue;
    payload[`todos/${item.id}`]={
      text:item.text,
      done:!!item.done,
      important:!!item.important,
      author:item.author,
      order:Number.isFinite(+item.order)?+item.order:GAP,
      createdAt:Number.isFinite(+item.createdAt)&&+item.createdAt>0?+item.createdAt:Date.now(),
      updatedAt:serverTimestamp(),
      createdBy:st.authUser.uid
    };
    count++;
  }

  if(!count)return false;
  status(`端末内の${count}件を共有データへ保存中`,"syncing");
  try{
    await update(ref(st.db),payload);
    status(`${count}件を共有データへ保存しました`,"online");
    return true;
  }catch(err){
    showFatal("端末データ保存失敗",err);
    return false;
  }
}
function showFatal(prefix,err){
  const code=err?.code||err?.message||String(err||"unknown");
  console.error(prefix,err);
  status(`${prefix}: ${code}`,"offline");
}
function connect(){
  if(!firebaseConfig.databaseURL||firebaseConfig.databaseURL.includes("PASTE_YOUR")){
    status("databaseURLを設定してください","offline");
    return;
  }
  try{
    firebaseApp=initializeApp(firebaseConfig);
    const auth=getAuth(firebaseApp);
    st.db=getDatabase(firebaseApp);

    let dataReceived=false;
    const dataTimer=setTimeout(()=>{
      if(!dataReceived)status("同期データ待機中・通信を確認してください","offline");
    },12000);

    onValue(ref(st.db,".info/connected"),snap=>{
      st.connected=snap.val()===true;
      status(
        st.connected?(st.user?`同期済み・${st.user}`:"同期済み"):"オフライン・端末キャッシュ",
        st.connected?"online":"offline"
      );
    },err=>showFatal("接続状態取得失敗",err));

    onAuthStateChanged(auth,u=>{
      if(!u){
        status("匿名ログイン中","syncing");
        signInAnonymously(auth).catch(err=>showFatal("匿名ログイン失敗",err));
        return;
      }

      st.authUser=u;
      status("タスクを同期中","syncing");

      onValue(ref(st.db,"todos"),async snap=>{
        dataReceived=true;
        clearTimeout(dataTimer);

        const raw=snap.val()||{};
        const entries=Object.entries(raw);

        /*
          The first empty server snapshot must not erase Safari-only cached tasks.
          Rescue them into the shared database once, then wait for the next snapshot.
        */
        if(!st.serverLoaded&&entries.length===0&&st.todos.size>0){
          st.serverLoaded=true;
          const rescued=await rescueLocalTodos();
          if(rescued)return;
        }

        st.serverLoaded=true;
        const nextTodos=new Map();
        for(const[id,value]of entries){
          nextTodos.set(id,norm(id,value));
        }

        st.todos=nextTodos;
        cache();
        render();

        status(
          st.connected
            ? `${st.user?`同期済み・${st.user}`:"同期済み"}・共有${st.todos.size}件`
            : `同期完了・共有${st.todos.size}件`,
          st.connected?"online":"syncing"
        );
      },err=>{
        clearTimeout(dataTimer);
        showFatal("タスク取得失敗",err);
      });
    });
  }catch(err){
    showFatal("Firebase初期化失敗",err);
  }
}
e.form.addEventListener("submit",async v=>{v.preventDefault();const t=e.input.value.trim();if(!t)return;if(!st.db||!st.authUser){status("Firebase接続待ち","offline");return}if(!st.user){status("利用者を選択してください","offline");return}e.input.value="";try{await add(t)}catch{e.input.value=t;e.input.focus()}});qa("[data-user]").forEach(b=>b.addEventListener("click",()=>{st.user=valid(b.dataset.user);localStorage.setItem(S.USER,st.user);render();e.input.focus()}));e.change.addEventListener("click",()=>{st.user="";localStorage.removeItem(S.USER);render()});e.filters.forEach(b=>b.addEventListener("click",()=>{st.filter=b.dataset.filter;localStorage.setItem(S.FILTER,st.filter);render()}));e.toggle.addEventListener("click",()=>{st.collapsed=!st.collapsed;localStorage.setItem(S.COLLAPSED,st.collapsed?"1":"0");render()});window.addEventListener("online",()=>status("再接続中","syncing"));
window.addEventListener("offline",()=>status("オフライン・端末キャッシュ","offline"));

load();
render();
connect();

/*
  Service Worker cleanup runs only after the app has already started.
  Every global is checked before use, so standalone Safari cannot stop here.
*/
setTimeout(async()=>{
  try{
    if("serviceWorker" in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg=>reg.unregister()));
    }
    if("caches" in window){
      const keys=await window.caches.keys();
      await Promise.all(keys.map(key=>window.caches.delete(key)));
    }
  }catch(err){
    console.warn("旧キャッシュの削除をスキップしました",err);
  }
},1500);
