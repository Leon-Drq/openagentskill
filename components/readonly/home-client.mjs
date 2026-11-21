import './reader-client.mjs'
// The original homepage is prebuilt. Menus need no React or application API.
const menus=[...document.querySelectorAll('[data-nav-section] button[aria-controls]')]
const closeMenus=()=>menus.forEach(button=>{button.setAttribute('aria-expanded','false');const menu=document.getElementById(button.getAttribute('aria-controls'));if(menu){menu.inert=true;menu.setAttribute('aria-hidden','true');delete menu.dataset.homeMenuOpen}})
menus.forEach(button=>button.addEventListener('click',()=>{
  const opening=button.getAttribute('aria-expanded')!=='true';closeMenus()
  const menu=document.getElementById(button.getAttribute('aria-controls'))
  if(opening&&menu){button.setAttribute('aria-expanded','true');menu.inert=false;menu.setAttribute('aria-hidden','false');menu.dataset.homeMenuOpen=''}
}))
if(menus.length){document.addEventListener('click',event=>{if(!event.target.closest('[data-nav-section]'))closeMenus()});document.addEventListener('keydown',event=>{if(event.key==='Escape'){const trigger=menus.find(button=>button.getAttribute('aria-expanded')==='true');closeMenus();trigger?.focus()}})}
document.querySelectorAll('[data-home-mobile]').forEach(menu=>{
  const close=()=>{menu.open=false;menu.querySelector('summary').focus()}
  menu.querySelector('[data-home-mobile-close]').addEventListener('click',close)
  menu.addEventListener('keydown',event=>{if(event.key==='Escape')close()})
})
