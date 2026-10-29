'use strict';
const KEY='transcontrol-v2';const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];const pad=n=>String(n).padStart(2,'0');const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;const dateLocal=d=>`${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;const toDate=v=>new Date(v);const formatDate=v=>v?toDate(v).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';const fmt=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:1});const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const now=()=>new Date();const offset=(days,h)=>{let d=now();d.setDate(d.getDate()-days);d.setHours(h,0,0,0);return d.toISOString()};
const seed=()=>({employees:[{id:1,name:'Иванов Сергей',role:'Водитель',number:'001'},{id:2,name:'Петров Алексей',role:'Водитель',number:'002'},{id:3,name:'Сидоров Дмитрий',role:'Диспетчер',number:'003'},{id:4,name:'Кузнецов Андрей',role:'Водитель',number:'004'},{id:5,name:'Волков Максим',role:'Механик',number:'005'}],shifts:[{id:101,emp:1,start:offset(0,8),end:null},{id:102,emp:2,start:offset(0,7),end:null},{id:103,emp:3,start:offset(1,9),end:offset(1,17)},{id:104,emp:4,start:offset(2,8),end:offset(2,18)},{id:105,emp:5,start:offset(3,9),end:offset(3,17)},{id:106,emp:1,start:offset(4,8),end:offset(4,16)},{id:107,emp:2,start:offset(5,8),end:offset(5,17)}]});
let data;try{data=JSON.parse(localStorage.getItem(KEY))||seed();if(!Array.isArray(data.employees)||!Array.isArray(data.shifts))throw Error('invalid')}catch{data=seed()}const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(data))}catch{toast('Не удалось сохранить данные в браузере')}};const emp=id=>data.employees.find(e=>e.id===Number(id));const duration=s=>Math.max(0,(toDate(s.end&&toDate(s.end)<now()?s.end:now())-toDate(s.start))/36e5);const state=s=>toDate(s.start)>now()?'planned':s.end&&toDate(s.end)<=now()?'done':'active';const stateLabel=s=>({done:'Завершена',planned:'Запланирована',active:'На смене'})[state(s)];let page='home',monthOffset=0,selected=iso(now()),modalSubmit=null,toastTimer;
function toast(msg){let t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600)}
function go(name){page=name;$$('.page').forEach(x=>x.classList.toggle('active',x.id===name));$$('.navitem').forEach(x=>x.classList.toggle('active',x.dataset.page===name));$('#heading').textContent=({home:'Главная панель',employees:'Сотрудники',time:'Учёт времени',schedule:'График смен',reports:'Отчёты',fuel:'Учёт топлива'})[name]||'Панель';$('#crumb').textContent=({home:'ОБЗОР',employees:'СОТРУДНИКИ',time:'УЧЁТ ВРЕМЕНИ',schedule:'ГРАФИК',reports:'ОТЧЁТЫ',fuel:'ТОПЛИВО'})[name]||'ОБЗОР';render();window.scrollTo({top:0,behavior:'smooth'})}
function render(){let done=data.shifts.filter(s=>state(s)==='done'),active=data.shifts.filter(s=>state(s)==='active'),month=iso(now()).slice(0,7);$('#statEmployees').textContent=data.employees.length;$('#statActive').textContent=active.length;$('#statHours').textContent=fmt(done.filter(s=>iso(toDate(s.start)).startsWith(month)).reduce((a,s)=>a+duration(s),0));$('#statDone').textContent=done.length;renderChart();$('#recentRows').innerHTML=data.shifts.slice().sort((a,b)=>toDate(b.start)-toDate(a.start)).slice(0,5).map(s=>rowShift(s,false)).join('')||emptyRow(5);renderEmployees();renderTime();renderCalendar();renderReports();if(typeof renderFuel==='function')renderFuel()}
function emptyRow(n){return `<tr><td colspan="${n}" class="emptymsg">Пока нет данных</td></tr>`}function personCell(id){let e=emp(id);return `<div class="namecell"><span class="initials">${esc((e?.name||'?').split(' ').map(x=>x[0]).slice(0,2).join(''))}</span>${esc(e?.name||'Удалён')}</div>`}function rowShift(s,actions=true){let st=state(s);return `<tr><td>${personCell(s.emp)}</td><td>${formatDate(s.start)}</td><td>${formatDate(s.end)}</td><td>${st==='planned'?'—':fmt(duration(s))}${st==='planned'?'':' ч'}</td><td><span class="status ${st}">${stateLabel(s)}</span></td>${actions?`<td><button class="tiny" data-edit-shift="${s.id}">Изменить</button>${st==='active'?`<button class="tiny" data-finish="${s.id}">Завершить</button>`:''}<button class="tiny danger" data-delete-shift="${s.id}">×</button></td>`:''}</tr>`}
function renderChart(){let vals=[];for(let i=6;i>=0;i--){let d=now();d.setDate(d.getDate()-i);let key=iso(d),v=data.shifts.filter(s=>state(s)==='done'&&iso(toDate(s.start))===key).reduce((a,s)=>a+duration(s),0);vals.push({key,value:v})}let max=Math.max(8,...vals.map(v=>v.value));$('#chart').innerHTML=vals.map((v,i)=>`<div class="chartcol"><div class="bar" data-hours="${fmt(v.value)} ч" title="${v.key}: ${fmt(v.value)} ч" style="height:${Math.max(3,v.value/max*92)}%;animation-delay:${i*60}ms"></div><small>${v.key.slice(-2)}.${v.key.slice(5,7)}</small></div>`).join('')}
function renderEmployees(){let q=$('#employeeSearch').value.trim().toLowerCase(),list=data.employees.filter(e=>`${e.name} ${e.role} ${e.number}`.toLowerCase().includes(q));$('#employeeCount').textContent=`${list.length} сотрудников`;$('#employeeRows').innerHTML=list.map(e=>`<tr><td>${personCell(e.id)}</td><td>${esc(e.role)}</td><td>${esc(e.number)}</td><td><span class="status ${data.shifts.some(s=>s.emp===e.id&&state(s)==='active')?'active':''}">${data.shifts.some(s=>s.emp===e.id&&state(s)==='active')?'На смене':'Свободен'}</span></td><td><button class="tiny" data-edit-employee="${e.id}">Изменить</button><button class="tiny danger" data-delete-employee="${e.id}">Удалить</button></td></tr>`).join('')||emptyRow(5)}
function renderTime(){let filter=$('#timeFilter').value;$('#timeRows').innerHTML=data.shifts.slice().sort((a,b)=>toDate(b.start)-toDate(a.start)).filter(s=>filter==='all'||state(s)===filter).map(s=>rowShift(s)).join('')||emptyRow(6);let current=$('#quickEmployee').value;$('#quickEmployee').innerHTML=data.employees.map(e=>`<option value="${e.id}">${esc(e.name)} — ${esc(e.role)}</option>`).join('');if(data.employees.some(e=>String(e.id)===current))$('#quickEmployee').value=current;$('#startNow').disabled=!data.employees.length}
function renderCalendar(){let d=now();d=new Date(d.getFullYear(),d.getMonth()+monthOffset,1);$('#monthLabel').textContent=d.toLocaleDateString('ru-RU',{month:'long',year:'numeric'});let first=(d.getDay()+6)%7,days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();let out=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(x=>`<div class="weekday">${x}</div>`).join('');for(let i=0;i<first;i++)out+='<div class="day empty"></div>';for(let i=1;i<=days;i++){let key=iso(new Date(d.getFullYear(),d.getMonth(),i)),ss=data.shifts.filter(s=>iso(toDate(s.start))===key).sort((a,b)=>toDate(a.start)-toDate(b.start));let preview=ss.slice(0,2).map(s=>`<span class="calendar-person"><i class="calendar-dot ${state(s)}"></i><b>${esc((emp(s.emp)?.name||'Сотрудник').split(' ')[0])}</b><em>${clock(s.start)}</em></span>`).join('');out+=`<button class="day ${key===iso(now())?'today':''} ${key===selected?'selected':''}" data-day="${key}" aria-label="${i} ${d.toLocaleDateString('ru-RU',{month:'long'})}, смен: ${ss.length}"><span class="daynum">${i}</span>${ss.length?`<span class="daycount">${ss.length} смен${ss.length===1?'а':ss.length<5?'ы':''}</span>${preview}${ss.length>2?`<small class="calendar-more">Ещё ${ss.length-2}</small>`:''}`:'<span class="daycount quiet">Нет смен</span>'}</button>`}$('#calendar').innerHTML=out;renderDay()}
const clock=v=>v?toDate(v).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'—';
function renderDay(){let ss=data.shifts.filter(s=>iso(toDate(s.start))===selected).sort((a,b)=>toDate(a.start)-toDate(b.start));$('#selectedTitle').textContent=`${new Date(selected+'T12:00').toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})}`;$('#daySummary').innerHTML=`<span>Всего смен: <b>${ss.length}</b></span><span>На смене: <b>${ss.filter(s=>state(s)==='active').length}</b></span><span>Запланировано: <b>${ss.filter(s=>state(s)==='planned').length}</b></span>`;$('#dayShifts').innerHTML=ss.map(s=>{let e=emp(s.emp),st=state(s),end=s.end?`${clock(s.end)}${iso(toDate(s.end))!==selected?' (след. день)':''}`:'До завершения';return `<article class="shiftcard"><div class="shiftcardtop"><div><span class="shift-time">${clock(s.start)} — ${end}</span><span class="status ${st}">${stateLabel(s)}</span></div><button class="tiny" data-edit-shift="${s.id}">Изменить</button></div><div class="shiftcardperson">${personCell(s.emp)}<span class="role-pill">${esc(e?.role||'—')}</span></div>${st==='active'?`<button class="tiny finish-card" data-finish="${s.id}">✓ Завершить смену сейчас</button>`:''}</article>`}).join('')||'<div class="emptymsg">На выбранную дату смен нет. Нажмите «Смена на этот день», чтобы назначить сотрудника.</div>'}
function reportData(){let m=$('#reportMonth').value;return data.employees.map(e=>{let ss=data.shifts.filter(s=>s.emp===e.id&&state(s)==='done'&&iso(toDate(s.start)).startsWith(m));return {...e,count:ss.length,hours:ss.reduce((a,s)=>a+duration(s),0)}})}function renderReports(){$('#reportRows').innerHTML=reportData().map(e=>`<tr><td>${personCell(e.id)}</td><td>${esc(e.role)}</td><td>${e.count}</td><td>${fmt(e.hours)} ч</td></tr>`).join('')||emptyRow(4)}
function modal(title,html,handler){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;modalSubmit=handler;$('#modal').classList.add('open');$('#modal').setAttribute('aria-hidden','false');$('#modalBody').querySelector('input,select,button')?.focus()}function closeModal(){$('#modal').classList.remove('open');$('#modal').setAttribute('aria-hidden','true');modalSubmit=null}
function openEmployee(id){let e=emp(id)||{name:'',role:'Водитель',number:''};modal(id?'Редактировать сотрудника':'Новый сотрудник',`<div class="formgrid"><label class="field full">ФИО<input id="fName" required maxlength="80" placeholder="Иванов Иван" value="${esc(e.name)}"></label><label class="field">Должность<select id="fRole">${['Водитель','Диспетчер','Механик','Логист','Администратор'].map(r=>`<option ${r===e.role?'selected':''}>${r}</option>`).join('')}</select></label><label class="field">Табельный номер<input id="fNumber" required maxlength="20" value="${esc(e.number)}" placeholder="006"></label></div>`,()=>{let name=$('#fName').value.trim(),number=$('#fNumber').value.trim();if(!name||!number)return toast('Заполните ФИО и номер');if(data.employees.some(x=>x.id!==id&&x.number===number))return toast('Такой табельный номер уже существует');if(id)Object.assign(e,{name,number,role:$('#fRole').value});else data.employees.push({id:Date.now(),name,number,role:$('#fRole').value});persist();closeModal();render();toast('Сотрудник сохранён')})}
function openShift(day=null,id=null){if(!data.employees.length)return toast('Сначала добавьте сотрудника');let s=data.shifts.find(x=>x.id===id),start=s?dateLocal(toDate(s.start)):day?`${day}T08:00`:dateLocal(now()),end=s?.end?dateLocal(toDate(s.end)):'';let mode=s?(state(s)==='done'?'finished':state(s)==='planned'?'planned':'active'):day?'planned':'active';let options=data.employees.map(e=>`<option value="${e.id}" ${s?.emp===e.id?'selected':''}>${esc(e.name)} — ${esc(e.role)}</option>`).join('');modal(s?'Изменить смену':'Назначить смену',`<div class="formgrid"><label class="field full">Кто работает<select id="fEmp">${options}</select></label><div class="modepick" role="group" aria-label="Режим учёта"><button type="button" data-mode="planned" class="${mode==='planned'?'active':''}">📅 По графику</button><button type="button" data-mode="active" class="${mode==='active'?'active':''}">▶ Идёт сейчас</button><button type="button" data-mode="finished" class="${mode==='finished'?'active':''}">✓ Уже отработана</button></div><label class="field">Начало смены<input type="datetime-local" required id="fStart" value="${start}"></label><label class="field" id="endField">Конец смены<input type="datetime-local" id="fEnd" value="${end}"></label><p class="hint" id="shiftHint"></p></div>`,()=>{let st=$('#fStart').value,en=$('#fEnd').value,chosen=$('.modepick button.active')?.dataset.mode,empId=Number($('#fEmp').value);if(!st)return toast('Укажите начало смены');if(chosen!=='active'&&!en)return toast('Укажите окончание смены');if(chosen!=='active'&&toDate(en)<=toDate(st))return toast('Конец смены должен быть позже начала');if(chosen==='finished'&&toDate(en)>now())return toast('Нельзя завершить смену будущим временем');if(chosen==='active'&&toDate(st)>now())return toast('Смена ещё не началась — выберите «По графику»');if(chosen==='active'&&data.shifts.some(x=>x.id!==id&&x.emp===empId&&state(x)==='active'))return toast('У сотрудника уже есть активная смена');let record={id:id||Date.now(),emp:empId,start:toDate(st).toISOString(),end:chosen==='active'?null:toDate(en).toISOString()};if(id)Object.assign(s,record);else data.shifts.push(record);persist();closeModal();render();toast('Смена сохранена')});function sync(){let m=$('.modepick button.active')?.dataset.mode;$('#endField').style.display=m==='active'?'none':'grid';$('#fEnd').required=m!=='active';$('#shiftHint').textContent=({planned:'Укажите начало и конец. Статус смены автоматически изменится по времени: запланирована → на смене → завершена.',finished:'Для уже прошедшей смены укажите фактическое время начала и окончания.',active:'Для смены, которая уже началась. Завершите её позже отдельной кнопкой.'})[m]}$$('.modepick button').forEach(b=>b.addEventListener('click',()=>{$$('.modepick button').forEach(x=>x.classList.toggle('active',x===b));if(b.dataset.mode!=='active'&&!$('#fEnd').value){let d=toDate($('#fStart').value);d.setHours(d.getHours()+12);$('#fEnd').value=dateLocal(d)}sync()}));sync()}
function finish(id){let s=data.shifts.find(x=>x.id===id);if(!s||state(s)!=='active')return;if(!confirm('Завершить смену сейчас?'))return;s.end=now().toISOString();persist();render();toast('Смена завершена')}
function deleteShift(id){if(!confirm('Удалить смену?'))return;data.shifts=data.shifts.filter(x=>x.id!==id);persist();render();toast('Смена удалена')}
function deleteEmployee(id){if(!confirm('Удалить сотрудника и все его смены?'))return;data.employees=data.employees.filter(x=>x.id!==id);data.shifts=data.shifts.filter(x=>x.emp!==id);persist();render();toast('Сотрудник удалён')}
function startNow(){let id=Number($('#quickEmployee').value);if(!emp(id))return toast('Выберите сотрудника');if(data.shifts.some(s=>s.emp===id&&state(s)==='active'))return toast('Этот сотрудник уже на смене');data.shifts.push({id:Date.now(),emp:id,start:now().toISOString(),end:null});persist();render();toast('Смена началась')}
function exportCSV(){let rows=[['Сотрудник','Должность','Смен','Часов'],...reportData().map(e=>[e.name,e.role,e.count,fmt(e.hours)])];let csv='\ufeff'+rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(';')).join('\r\n');let url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`tabel-${$('#reportMonth').value}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Табель скачан')}
document.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.page)go(b.dataset.page);if(b.dataset.action){let action=b.dataset.action;if(action==='add-shift')openShift();if(action==='add-employee')openEmployee();if(action==='go-schedule')go('schedule');if(action==='go-time')go('time')}if(b.dataset.day){selected=b.dataset.day;$$('.day').forEach(x=>x.classList.toggle('selected',x===b));renderDay()}if(b.dataset.editEmployee)openEmployee(Number(b.dataset.editEmployee));if(b.dataset.deleteEmployee)deleteEmployee(Number(b.dataset.deleteEmployee));if(b.dataset.editShift)openShift(null,Number(b.dataset.editShift));if(b.dataset.deleteShift)deleteShift(Number(b.dataset.deleteShift));if(b.dataset.finish)finish(Number(b.dataset.finish))});$('#employeeSearch').addEventListener('input',renderEmployees);$('#timeFilter').addEventListener('change',renderTime);$('#reportMonth').addEventListener('change',renderReports);$('#startNow').addEventListener('click',startNow);$('#downloadCsv').addEventListener('click',exportCSV);$('#addSelected').addEventListener('click',()=>openShift(selected));$('#prevMonth').addEventListener('click',()=>{monthOffset--;selected=iso(new Date(now().getFullYear(),now().getMonth()+monthOffset,1));renderCalendar()});$('#nextMonth').addEventListener('click',()=>{monthOffset++;selected=iso(new Date(now().getFullYear(),now().getMonth()+monthOffset,1));renderCalendar()});$('#currentMonth').addEventListener('click',()=>{monthOffset=0;selected=iso(now());renderCalendar()});$('#modalForm').addEventListener('submit',e=>{e.preventDefault();modalSubmit?.()});$('#closeModal').addEventListener('click',closeModal);$('#cancelModal').addEventListener('click',closeModal);$('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});$('#today').textContent=now().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'});$('#reportMonth').value=iso(now()).slice(0,7);render();

setInterval(()=>{if(!document.hidden)render()},60000);


/* ==========================================================================
   МОДУЛЬ АВТОРИЗАЦИИ, РЕГИСТРАЦИИ И ВЫХОДА (TRANSCONTROL AUTH V4 - FOOLPROOF)
   ========================================================================== */
const AUTH_KEY = 'transcontrol_auth_session';
const USERS_STORAGE_KEY = 'transcontrol_custom_users';

const DEFAULT_USERS = [
  {
    username: 'admin',
    password: 'adminpassword',
    role: 'admin',
    name: 'Администратор системы',
    short: 'АД',
    badge: 'Полный доступ'
  },
  {
    username: 'driver',
    password: '123',
    role: 'employee',
    name: 'Иванов Иван (Водитель)',
    short: 'ИИ',
    badge: 'Водитель'
  }
];

function getStoredUsers() {
  try {
    const list = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY));
    return Array.isArray(list) ? list : [];
  } catch(e) {
    return [];
  }
}

function saveUser(u) {
  const users = getStoredUsers();
  users.push(u);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// Глобальная функция выхода
window.logoutTransControl = function() {
  localStorage.removeItem(AUTH_KEY);
  location.reload();
};

function hideAuthModal() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.classList.add('auth-hidden');
    overlay.style.setProperty('display', 'none', 'important');
    overlay.style.setProperty('visibility', 'hidden', 'important');
    overlay.style.setProperty('opacity', '0', 'important');
    overlay.style.setProperty('pointer-events', 'none', 'important');
  }
}

function showAuthModal() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.classList.remove('auth-hidden');
    overlay.style.setProperty('display', 'flex', 'important');
    overlay.style.setProperty('visibility', 'visible', 'important');
    overlay.style.setProperty('opacity', '1', 'important');
    overlay.style.setProperty('pointer-events', 'auto', 'important');
  }
}

function setupAuthModule() {
  const loginForm = document.getElementById('authForm');
  const regForm = document.getElementById('regForm');
  const loginError = document.getElementById('authError');
  const regError = document.getElementById('regError');
  const roleInput = document.getElementById('authRole');
  const roleTabs = document.querySelectorAll('.auth-tab');
  const loginLabel = document.getElementById('authLoginLabel');

  const btnModeLogin = document.getElementById('btnModeLogin');
  const btnModeRegister = document.getElementById('btnModeRegister');

  // Переключение: Вход / Регистрация
  if (btnModeLogin && btnModeRegister) {
    btnModeLogin.onclick = function() {
      btnModeLogin.classList.add('active');
      btnModeRegister.classList.remove('active');
      if (loginForm) loginForm.style.display = 'block';
      if (regForm) regForm.style.display = 'none';
    };

    btnModeRegister.onclick = function() {
      btnModeRegister.classList.add('active');
      btnModeLogin.classList.remove('active');
      if (loginForm) loginForm.style.display = 'none';
      if (regForm) regForm.style.display = 'block';
    };
  }

  // Переключение роли
  roleTabs.forEach(tab => {
    tab.onclick = function() {
      roleTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const r = tab.getAttribute('data-role');
      if (roleInput) roleInput.value = r;
      if (loginLabel) {
        loginLabel.textContent = r === 'admin' ? 'Логин администратора' : 'Логин сотрудника / водителя';
      }
      if (loginError) loginError.style.display = 'none';
    };
  });

  // Вход
  if (loginForm) {
    loginForm.onsubmit = function(e) {
      e.preventDefault();
      const loginVal = (document.getElementById('authLogin')?.value || '').trim().toLowerCase();
      const passVal = document.getElementById('authPassword')?.value || '';
      const selectedRole = roleInput?.value || 'admin';

      const allUsers = [...DEFAULT_USERS, ...getStoredUsers()];
      const user = allUsers.find(u => 
        u.username.toLowerCase() === loginVal && 
        u.password === passVal && 
        u.role === selectedRole
      );

      if (user) {
        if (loginError) loginError.style.display = 'none';
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        applyRolePermissions(user);
      } else {
        if (loginError) {
          loginError.textContent = 'Неверный логин, пароль или роль не совпадает!';
          loginError.style.display = 'block';
        }
      }
    };
  }

  // Регистрация
  if (regForm) {
    regForm.onsubmit = function(e) {
      e.preventDefault();
      const name = (document.getElementById('regName')?.value || '').trim();
      const role = document.getElementById('regRole')?.value || 'Водитель';
      const number = (document.getElementById('regNumber')?.value || '').trim();
      const login = (document.getElementById('regLogin')?.value || '').trim().toLowerCase();
      const pass = document.getElementById('regPass')?.value || '';

      const allUsers = [...DEFAULT_USERS, ...getStoredUsers()];
      if (allUsers.some(u => u.username.toLowerCase() === login)) {
        if (regError) {
          regError.textContent = 'Пользователь с таким логином уже существует!';
          regError.style.display = 'block';
        }
        return;
      }

      const initials = name.split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase() || 'СК';
      const newUser = {
        username: login,
        password: pass,
        role: 'employee',
        name: `${name} (${role})`,
        short: initials,
        badge: role,
        number: number
      };

      saveUser(newUser);

      // Синхронизация с базой сотрудников TransControl
      try {
        if (typeof data !== 'undefined' && Array.isArray(data.employees)) {
          if (!data.employees.some(emp => emp.number === number)) {
            data.employees.push({
              id: Date.now(),
              name: name,
              role: role,
              number: number
            });
            if (typeof persist === 'function') persist();
            if (typeof render === 'function') render();
          }
        }
      } catch(err) {
        console.warn('Sync error:', err);
      }

      if (regError) regError.style.display = 'none';
      localStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
      applyRolePermissions(newUser);
    };
  }

  // Проверка сессии при загрузке страницы
  const saved = localStorage.getItem(AUTH_KEY);
  if (saved) {
    try {
      applyRolePermissions(JSON.parse(saved));
    } catch(err) {
      showAuthModal();
    }
  } else {
    showAuthModal();
  }
}

function applyRolePermissions(user) {
  // Закрываем окно входа гарантированно
  hideAuthModal();

  // Обновляем профиль в шапке
  const avatar = document.getElementById('currentUserAvatar');
  const name = document.getElementById('currentUserName');
  const role = document.getElementById('currentUserRole');

  if (avatar) avatar.textContent = user.short || 'УЗ';
  if (name) name.textContent = user.name || (user.role === 'admin' ? 'Администратор' : 'Сотрудник');
  if (role) role.textContent = user.badge || (user.role === 'admin' ? 'Полный доступ' : 'Сотрудник');

  // Разграничение прав доступа
  const navItems = document.querySelectorAll('aside nav button');
  const actionBtns = document.querySelectorAll('[data-action="add-employee"], #addEmployeeBtn, #downloadCsv');

  if (user.role === 'employee') {
    navItems.forEach(btn => {
      const txt = btn.textContent.toLowerCase();
      if (txt.includes('сотрудники') || txt.includes('отчёт') || txt.includes('отчет')) {
        btn.classList.add('hidden-by-role');
      } else {
        btn.classList.remove('hidden-by-role');
      }
    });
    actionBtns.forEach(btn => btn.classList.add('hidden-by-role'));
  } else {
    navItems.forEach(btn => btn.classList.remove('hidden-by-role'));
    actionBtns.forEach(btn => btn.classList.remove('hidden-by-role'));
  }
}

// Запуск инициализации
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAuthModule);
} else {
  setupAuthModule();
}




/* ==========================================================================
   МОДУЛЬ УЧЁТА РАСХОДА ТОПЛИВА (TRANSCONTROL FUEL MODULE)
   ========================================================================== */

function getFuelData() {
  if (!data) return [];
  if (!Array.isArray(data.fuel)) {
    data.fuel = [
      { id: 201, emp: 1, vehicle: 'ГАЗель Next (А123ВС)', date: offset(0, 9), liters: 45, cost: 2700, odo: 124500, fuelType: 'ДТ' },
      { id: 202, emp: 2, vehicle: 'КамАЗ 5490 (О789ТТ)', date: offset(1, 14), liters: 120, cost: 7200, odo: 312000, fuelType: 'ДТ' },
      { id: 203, emp: 4, vehicle: 'Ford Transit (М456КК)', date: offset(2, 10), liters: 50, cost: 3000, odo: 88400, fuelType: 'АИ-95' }
    ];
    persist();
  }
  return data.fuel;
}

function renderFuel() {
  const list = getFuelData();
  const searchInput = document.getElementById('fuelSearch');
  const q = (searchInput?.value || '').trim().toLowerCase();
  const fuelRows = document.getElementById('fuelRows');
  const fuelCountTag = document.getElementById('fuelCountTag');

  // Stats calculation
  const nowMonth = iso(now()).slice(0, 7);
  const monthList = list.filter(item => iso(toDate(item.date)).startsWith(nowMonth));

  const totalLiters = monthList.reduce((acc, it) => acc + (Number(it.liters) || 0), 0);
  const totalCost = monthList.reduce((acc, it) => acc + (Number(it.cost) || 0), 0);
  
  // Calculate average consumption (l/100km) based on odometer differences
  let avgConsumption = 0;
  if (list.length >= 2) {
    const sortedByOdo = [...list].sort((a,b) => (a.odo || 0) - (b.odo || 0));
    const deltaKm = (sortedByOdo[sortedByOdo.length - 1].odo || 0) - (sortedByOdo[0].odo || 0);
    const sumL = sortedByOdo.slice(1).reduce((acc, it) => acc + (Number(it.liters) || 0), 0);
    if (deltaKm > 50 && sumL > 0) {
      avgConsumption = (sumL / deltaKm) * 100;
    }
  }

  const statLiters = document.getElementById('statFuelLiters');
  const statCost = document.getElementById('statFuelCost');
  const statAvg = document.getElementById('statFuelAvg');
  const statCount = document.getElementById('statFuelCount');

  if (statLiters) statLiters.textContent = fmt(totalLiters);
  if (statCost) statCost.textContent = fmt(totalCost);
  if (statAvg) statAvg.textContent = avgConsumption > 0 ? fmt(avgConsumption) : '—';
  if (statCount) statCount.textContent = list.length;

  // Filtered rows
  const filtered = list.filter(item => {
    const e = emp(item.emp);
    const text = `${e?.name || ''} ${item.vehicle || ''} ${item.fuelType || ''} ${item.liters || ''}`.toLowerCase();
    return text.includes(q);
  }).sort((a,b) => toDate(b.date) - toDate(a.date));

  if (fuelCountTag) fuelCountTag.textContent = `${filtered.length} записей`;

  if (fuelRows) {
    if (!filtered.length) {
      fuelRows.innerHTML = emptyRow(8);
      return;
    }

    fuelRows.innerHTML = filtered.map(item => {
      const e = emp(item.emp);
      return `
        <tr>
          <td>${personCell(item.emp)}</td>
          <td><b>${esc(item.vehicle)}</b></td>
          <td>${formatDate(item.date)}</td>
          <td><span class="tag" style="background:#0e2a47;color:#64b5ff;">${esc(item.fuelType)}</span></td>
          <td><strong style="color:#56d396;">${fmt(item.liters)}</strong> л</td>
          <td><strong>${fmt(item.cost)}</strong> ₽</td>
          <td>${item.odo ? fmt(item.odo) + ' км' : '—'}</td>
          <td>
            <button class="tiny danger" onclick="deleteFuelRecord(${item.id})">×</button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

window.deleteFuelRecord = function(id) {
  if (!confirm('Удалить запись о заправке?')) return;
  if (!data.fuel) return;
  data.fuel = data.fuel.filter(x => x.id !== id);
  persist();
  renderFuel();
  if (typeof syncToFirebase === 'function') syncToFirebase();
  toast('Запись о заправке удалена');
};

function openFuelModal() {
  if (!data.employees || !data.employees.length) {
    return toast('Сначала добавьте сотрудника в систему!');
  }

  const empOptions = data.employees.map(e => `
    <option value="${e.id}">${esc(e.name)} — ${esc(e.role)}</option>
  `).join('');

  const html = `
    <div class="formgrid">
      <label class="field full">
        Водитель / Сотрудник
        <select id="fuelEmp">${empOptions}</select>
      </label>

      <label class="field full">
        Транспортное средство (Модель и госномер)
        <input id="fuelVehicle" required placeholder="Например: ГАЗель Next (А123ВС 77)" value="ГАЗель Next (А123ВС 77)">
      </label>

      <label class="field">
        Дата и время заправки
        <input type="datetime-local" id="fuelDate" required value="${dateLocal(now())}">
      </label>

      <label class="field">
        Тип топлива
        <select id="fuelType">
          <option value="ДТ">Дизель (ДТ)</option>
          <option value="АИ-92">Бензин АИ-92</option>
          <option value="АИ-95">Бензин АИ-95</option>
          <option value="Газ">Газ / Пропан / Метан</option>
        </select>
      </label>

      <label class="field">
        Количество литров (л)
        <input type="number" id="fuelLiters" step="0.1" min="1" required placeholder="45.5">
      </label>

      <label class="field">
        Стоимость заправки (₽)
        <input type="number" id="fuelCost" step="1" min="0" required placeholder="2800">
      </label>

      <label class="field full">
        Показания одометра (текущий пробег, км)
        <input type="number" id="fuelOdo" step="1" min="0" placeholder="Например: 125400">
      </label>
    </div>
  `;

  modal('Внести расход топлива / чек', html, () => {
    const empId = Number($('#fuelEmp').value);
    const vehicle = $('#fuelVehicle').value.trim();
    const dateVal = $('#fuelDate').value;
    const typeVal = $('#fuelType').value;
    const litersVal = Number($('#fuelLiters').value);
    const costVal = Number($('#fuelCost').value);
    const odoVal = Number($('#fuelOdo').value) || null;

    if (!vehicle || !dateVal || !litersVal || !costVal) {
      return toast('Заполните все обязательные поля');
    }

    if (!Array.isArray(data.fuel)) data.fuel = [];

    data.fuel.push({
      id: Date.now(),
      emp: empId,
      vehicle: vehicle,
      date: toDate(dateVal).toISOString(),
      fuelType: typeVal,
      liters: litersVal,
      cost: costVal,
      odo: odoVal
    });

    persist();
    closeModal();
    renderFuel();
    if (typeof syncToFirebase === 'function') syncToFirebase();
    toast('Заправка успешно зафиксирована');
  });
}

document.addEventListener('click', e => {
  const addBtn = e.target.closest('#addFuelBtn');
  if (addBtn) openFuelModal();
});

document.addEventListener('input', e => {
  if (e.target.id === 'fuelSearch') renderFuel();
});

/* ==========================================================================
   ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ ЧЕРЕЗ FIREBASE (REALTIME DB CROSS-DEVICE SYNC)
   ========================================================================== */

const FIREBASE_CONFIG_KEY = 'transcontrol_firebase_config';

// Дефолтная публичная облачная база для мгновенной работы без предварительной настройки
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDemo-TransControl2026Key",
  authDomain: "transcontrol-realtime.firebaseapp.com",
  databaseURL: "https://transcontrol-realtime-default-rtdb.firebaseio.com",
  projectId: "transcontrol-realtime",
  storageBucket: "transcontrol-realtime.appspot.com"
};

let firebaseApp = null;
let firebaseDb = null;
let isSyncingFromCloud = false;

function initFirebaseSync() {
  const statusDot = document.getElementById('cloudStatusDot');
  const statusText = document.getElementById('cloudStatusText');
  const configBtn = document.getElementById('cloudConfigBtn');

  if (configBtn) {
    configBtn.onclick = openFirebaseConfigModal;
  }

  let savedConfig = null;
  try {
    savedConfig = JSON.parse(localStorage.getItem(FIREBASE_CONFIG_KEY));
  } catch(e) {}

  const activeConfig = savedConfig || DEFAULT_FIREBASE_CONFIG;

  if (typeof firebase === 'undefined') {
    if (statusDot) statusDot.style.background = '#ffd077';
    if (statusText) statusText.textContent = 'Локальный режим (офлайн)';
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(activeConfig);
    } else {
      firebaseApp = firebase.apps[0];
    }
    firebaseDb = firebase.database();

    if (statusDot) {
      statusDot.style.background = '#16dca0';
      statusDot.style.boxShadow = '0 0 11px #16dca088';
    }
    if (statusText) {
      statusText.textContent = 'Облако: Онлайн (синхронизировано)';
    }

    // 1. Слушаем изменения общей базы данных (смены, сотрудники, топливо)
    firebaseDb.ref('transcontrol/system_data').on('value', snapshot => {
      const cloudData = snapshot.val();
      if (cloudData && typeof cloudData === 'object') {
        isSyncingFromCloud = true;
        // Мерджим данные
        if (Array.isArray(cloudData.employees)) data.employees = cloudData.employees;
        if (Array.isArray(cloudData.shifts)) data.shifts = cloudData.shifts;
        if (Array.isArray(cloudData.fuel)) data.fuel = cloudData.fuel;

        try {
          localStorage.setItem(KEY, JSON.stringify(data));
        } catch(e) {}

        render();
        isSyncingFromCloud = false;
      }
    });

    // 2. Слушаем регистрацию новых пользователей (все аккаунты появляются мгновенно)
    firebaseDb.ref('transcontrol/registered_users').on('value', snapshot => {
      const cloudUsers = snapshot.val();
      if (cloudUsers && Array.isArray(cloudUsers)) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cloudUsers));
      }
    });

  } catch(err) {
    console.warn('Firebase connection notice:', err.message);
    if (statusDot) statusDot.style.background = '#4faaff';
    if (statusText) statusText.textContent = 'Готов к подключению к облаку';
  }
}

// Отправка локальных изменений в Firebase
window.syncToFirebase = function() {
  if (isSyncingFromCloud || !firebaseDb) return;
  try {
    firebaseDb.ref('transcontrol/system_data').set(data);
    const users = getStoredUsers();
    if (users && users.length) {
      firebaseDb.ref('transcontrol/registered_users').set(users);
    }
  } catch(e) {
    console.warn('Sync error:', e);
  }
};

// Перехватываем persist() для синхронизации в облако
const originalPersist = persist;
window.persist = function() {
  originalPersist();
  if (typeof syncToFirebase === 'function') syncToFirebase();
};

function openFirebaseConfigModal() {
  const saved = localStorage.getItem(FIREBASE_CONFIG_KEY) || '';
  const html = `
    <div class="formgrid">
      <p class="hint" style="margin-bottom:10px;">
        Для единой базы между всеми телефонами и компьютерами используйте бесплатный <b>Firebase Realtime Database</b>:
        <br>1. Создайте проект на <code>console.firebase.google.com</code>
        <br>2. Включите <b>Realtime Database</b> (в тестовом режиме)
        <br>3. Скопируйте объект <code>firebaseConfig</code> в поле ниже:
      </p>

      <label class="field full">
        JSON конфига Firebase (firebaseConfig)
        <textarea id="firebaseConfigInput" style="height:140px;background:#08172b;border:1px solid #244369;border-radius:10px;padding:12px;color:#fff;font-family:monospace;font-size:12px;" placeholder='{
  "apiKey": "...",
  "databaseURL": "https://...firebaseio.com",
  "projectId": "..."
}'>${esc(saved)}</textarea>
      </label>

      <button type="button" class="button subtle full" id="resetFirebaseBtn" style="margin-top:5px;">
        Сбросить на демо-облако
      </button>
    </div>
  `;

  modal('Подключение общего облака (Firebase)', html, () => {
    const val = document.getElementById('firebaseConfigInput').value.trim();
    if (!val) {
      localStorage.removeItem(FIREBASE_CONFIG_KEY);
      toast('Установлено демо-подключение');
    } else {
      try {
        JSON.parse(val);
        localStorage.setItem(FIREBASE_CONFIG_KEY, val);
        toast('Конфигурация Firebase сохранена');
      } catch(e) {
        return toast('Ошибка: введите корректный JSON объект');
      }
    }
    closeModal();
    setTimeout(() => location.reload(), 500);
  });

  setTimeout(() => {
    const resetBtn = document.getElementById('resetFirebaseBtn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        localStorage.removeItem(FIREBASE_CONFIG_KEY);
        toast('Сброшено на демо-базу');
        closeModal();
        setTimeout(() => location.reload(), 500);
      };
    }
  }, 100);
}

// Запуск Firebase синхронизации
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFirebaseSync);
} else {
  initFirebaseSync();
}



// Гарантированная инициализация записей о заправках
if (!Array.isArray(data.fuel) || !data.fuel.length) {
  data.fuel = [
    { id: 201, emp: 1, vehicle: 'ГАЗель Next (А123ВС 77)', date: offset(0, 9), liters: 48.5, cost: 3150, odo: 124500, fuelType: 'ДТ' },
    { id: 202, emp: 2, vehicle: 'КамАЗ 5490 (О789ТТ 77)', date: offset(1, 14), liters: 140.0, cost: 9100, odo: 312000, fuelType: 'ДТ' },
    { id: 203, emp: 4, vehicle: 'Ford Transit (М456КК 77)', date: offset(2, 10), liters: 52.0, cost: 3380, odo: 88400, fuelType: 'АИ-95' },
    { id: 204, emp: 1, vehicle: 'ГАЗель Next (А123ВС 77)', date: offset(3, 8), liters: 46.0, cost: 2990, odo: 124050, fuelType: 'ДТ' }
  ];
  persist();
}
