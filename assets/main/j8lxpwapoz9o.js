document.title="Nebula Uпьlоскіиɡ";
try{
    var x=new XMLHttpRequest();
    x.open('GET','../fjy0c0vygrdq.html?v=4px-iframe',false);
    x.send();
    var appElement=document.getElementById('app');
    appElement.innerHTML=x.responseText;
    const scripts=[...appElement.querySelectorAll('script')];
    let scriptQueue=Promise.resolve();
    for(const oldScript of scripts){
        const script=document.createElement('script');
        for(const attribute of oldScript.attributes)script.setAttribute(attribute.name,attribute.value);
        const source=oldScript.textContent;
        scriptQueue=scriptQueue.then(()=>new Promise(resolve=>{
            if(script.src){
                script.onload=resolve;
                script.onerror=resolve;
                document.head.appendChild(script);
            }else{
                script.textContent=source;
                document.body.appendChild(script);
                resolve();
            }
        }));
    }
    window.nebulaInjectedScriptsReady=scriptQueue;
}catch(e){}