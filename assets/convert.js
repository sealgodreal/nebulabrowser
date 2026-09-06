const eduChars={A:"А",a:"а",B:"В",b:"ь",C:"С",c:"с",D:"ꓓ",d:"ԁ",E:"Е",e:"е",F:"Ғ",f:"ғ",G:"Ԍ",g:"ɡ",H:"Н",h:"һ",I:"І",i:"і",J:"Ј",j:"ј",K:"К",k:"к",L:"ꓡ",l:"ӏ",M:"М",m:"м",N:"П",n:"п",O:"О",o:"о",P:"Р",p:"р",Q:"ԛ",q:"զ",R:"ᖇ",r:"г",S:"Ѕ",s:"ѕ",T:"Т",t:"т",U:"ꓴ",u:"ᴜ",V:"Ѵ",v:"ѵ",W:"Ш",w:"ш",X:"Х",x:"х",Y:"У",y:"у",Z:"Ζ",z:"ᴢ"};
function convertTXT(text){return[...String(text)].map(char=>eduChars[char]||char).join("");}
document.documentElement.classList.add("txt-loading");
const txtLoadingStyle=document.createElement("style");
txtLoadingStyle.textContent=`html.txt-loading body{visibility:hidden!important;}`;
document.head.appendChild(txtLoadingStyle);
const TXT_IGNORE_TAGS=new Set(["SCRIPT","STYLE","NOSCRIPT","TEXTAREA"]);
function shouldTXTIgnore(el){
    if(!el||el.nodeType!==Node.ELEMENT_NODE)return false;
    return TXT_IGNORE_TAGS.has(el.tagName)||!!el.closest(".wordmark");
}
function convertTextNode(node){
    if(!node||!node.nodeValue)return;
    if(shouldTXTIgnore(node.parentElement))return;
    node.nodeValue=convertTXT(node.nodeValue);
}
function convertAttributes(el){
    if(!el||el.nodeType!==Node.ELEMENT_NODE||shouldTXTIgnore(el))return;
    const attributes=["title","placeholder","alt","aria-label"];
    for(const attr of attributes){
        if(!el.hasAttribute(attr))continue;
        const value=el.getAttribute(attr);
        if(value)el.setAttribute(attr,convertTXT(value));
    }
}
function convertTXTTree(root){
    if(!root)return;
    if(root.nodeType===Node.TEXT_NODE){convertTextNode(root);return;}
    if(root.nodeType!==Node.ELEMENT_NODE||shouldTXTIgnore(root))return;
    convertAttributes(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
        acceptNode(node){
            return shouldTXTIgnore(node.parentElement)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
        }
    });
    const textNodes=[];
    while(walker.nextNode())textNodes.push(walker.currentNode);
    for(const node of textNodes)convertTextNode(node);
    root.querySelectorAll("*").forEach(convertAttributes);
}
function initialTXTConversion(){
    if(!document.body)return;
    convertTXTTree(document.body);
    document.documentElement.classList.remove("txt-loading");
}
const txtObserver=new MutationObserver(mutations=>{
    txtObserver.disconnect();
    for(const mutation of mutations){
        if(mutation.type==="characterData")convertTextNode(mutation.target);
        if(mutation.type==="childList"){
            for(const node of mutation.addedNodes){
                if(node.nodeType===Node.TEXT_NODE)convertTextNode(node);
                else if(node.nodeType===Node.ELEMENT_NODE)convertTXTTree(node);
            }
        }
        if(mutation.type==="attributes"&&mutation.target.nodeType===Node.ELEMENT_NODE)convertAttributes(mutation.target);
    }
    txtObserver.observe(document.body,{
        childList:true,
        subtree:true,
        characterData:true,
        attributes:true,
        attributeFilter:["title","placeholder","alt","aria-label"]
    });
});
function startTXTSystem(){
    initialTXTConversion();
    txtObserver.observe(document.body,{
        childList:true,
        subtree:true,
        characterData:true,
        attributes:true,
        attributeFilter:["title","placeholder","alt","aria-label"]
    });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startTXTSystem,{once:true});
else startTXTSystem();