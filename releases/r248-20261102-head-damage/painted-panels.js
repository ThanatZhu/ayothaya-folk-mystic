export function paintedPanels(){
 if(document.getElementById('painted-panels150'))return;
 const link=document.createElement('link');link.id='painted-panels150';link.rel='stylesheet';link.href='painted-panels150.css?v=150';document.body.append(link);
}
