import{c as C,s as f,l as B,L as U,X,y as Y,C as L,z as V}from"./index-C1IwHyoK.js";import{a as l,j as e,A as J,m as R}from"./vendor-motion-CvgbSNa8.js";import{n as K,I as Z,a as Q,r as ee,M as te}from"./phone-DQpufF-G.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=C("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=C("CloudUpload",[["path",{d:"M12 13v8",key:"1l5pq0"}],["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242",key:"1pljnt"}],["path",{d:"m8 17 4-4 4 4",key:"1quai1"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const le=C("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=C("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ce=C("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pe=C("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);function de({session:c,onSaved:m}){var i;const p=(i=c==null?void 0:c.user)==null?void 0:i.id,[o,d]=l.useState(!1),[s,h]=l.useState(""),[x,j]=l.useState(!1),[w,n]=l.useState("");if(l.useEffect(()=>{let b=!0;if(p)return f.from("seller_contacts").select("whatsapp_number").eq("user_id",p).maybeSingle().then(({data:g,error:_})=>{b&&!_&&d(!(g!=null&&g.whatsapp_number))}),()=>{b=!1}},[p]),!p||!o)return null;async function u(b){b.preventDefault();const g=K(s);if(!g){n("Enter a valid Malawi mobile number, for example 0991234567.");return}j(!0),n("");const{error:_}=await f.from("seller_contacts").upsert({user_id:p,whatsapp_number:g},{onConflict:"user_id"});if(j(!1),_){n("Could not save your number. Please try again.");return}d(!1),m==null||m()}return e.jsxs("form",{className:"cf-wa-prompt",onSubmit:u,children:[e.jsxs("div",{className:"cf-wa-prompt-head",children:[e.jsx(B,{size:18}),e.jsxs("div",{children:[e.jsx("strong",{children:"Add your WhatsApp number"}),e.jsx("small",{children:"Buyers contact you on WhatsApp. Without a number they can't reach you."})]})]}),e.jsxs("div",{className:"cf-wa-prompt-row",children:[e.jsx("input",{type:"tel",inputMode:"tel",value:s,onChange:b=>h(b.target.value),placeholder:"e.g. 0991234567","aria-label":"WhatsApp number"}),e.jsx("button",{type:"submit",disabled:x||!s.trim(),children:x?e.jsx(U,{size:15,className:"cf-spin"}):"Save"})]}),w&&e.jsx("p",{role:"alert",children:w})]})}function ue({chargeId:c,onStatus:m,timeoutMs:p=9e4}){const o=l.useRef(m);o.current=m,l.useEffect(()=>{if(!c)return;let d=!0,s=null,h=null;function x(n){var u;d&&(d=!1,(u=o.current)==null||u.call(o,n),s&&f.removeChannel(s),h&&clearTimeout(h))}async function j(){const{data:n,error:u}=await f.from("payments").select("status").eq("charge_id",c).maybeSingle();!d||u||!n||(n.status==="successful"||n.status==="failed")&&x(n.status)}function w(n){var i;const u=(i=n.new)==null?void 0:i.status;(u==="successful"||u==="failed")&&x(u)}return j(),s=f.channel(`payment-${c}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"payments",filter:`charge_id=eq.${c}`},w).on("postgres_changes",{event:"INSERT",schema:"public",table:"payments",filter:`charge_id=eq.${c}`},w).subscribe(),h=setTimeout(()=>{d&&x("timeout")},p),()=>{d=!1,s&&f.removeChannel(s),h&&clearTimeout(h)}},[c,p])}const T=5,se=te;function fe({listingId:c,onUploaded:m}){const p=l.useRef(null),[o,d]=l.useState([]),[s,h]=l.useState(!1),[x,j]=l.useState(0),[w,n]=l.useState(""),[u,i]=l.useState(""),[b,g]=l.useState(!1),[_,F]=l.useState([]);l.useEffect(()=>{const t=o.map(a=>({file:a,url:URL.createObjectURL(a)}));return F(t),()=>{t.forEach(a=>URL.revokeObjectURL(a.url))}},[o]);function $(t){i(""),n("");const a=Array.from(t||[]),M=[];for(const r of a){if(!["image/jpeg","image/png","image/webp"].includes(r.type)){i("Please choose JPG, PNG or WebP images.");continue}if(r.size>se){i(`${r.name} is too large (max 25 MB).`);continue}M.push(r)}d(r=>{const N=T-r.length;return M.length>N&&i(`You can add only ${N} more image(s).`),[...r,...M].slice(0,T)})}function I(t){$(t.target.files),t.target.value=""}function W(t){d(a=>a.filter((M,r)=>r!==t)),i("")}function H(t){t.preventDefault(),g(!1),s||$(t.dataTransfer.files)}async function G(){if(!V||!f){i("Supabase is not configured.");return}if(!c){i("Create a listing before uploading its photos.");return}if(!o.length){i("Choose at least one image.");return}let t=0;h(!0),j(0),i(""),n("");try{const{data:a}=await f.auth.getSession();if(!(a==null?void 0:a.session))throw new Error("Please sign in before uploading images.");const{data:r,error:N}=await f.functions.invoke("cloudinary-sign");if(N)throw N;if(!(r!=null&&r.signature))throw new Error("Could not obtain an upload signature.");const O=await Q(o,3,async k=>{var D;const E=await ee(k),y=new FormData;y.append("file",E),y.append("api_key",r.api_key),y.append("timestamp",String(r.timestamp)),y.append("folder",r.folder),y.append("signature",r.signature),r.allowed_formats&&y.append("allowed_formats",r.allowed_formats);const P=await fetch(`https://api.cloudinary.com/v1_1/${r.cloud_name}/image/upload`,{method:"POST",body:y}),A=await P.json();if(!P.ok)throw new Error(((D=A.error)==null?void 0:D.message)||"Cloudinary upload failed.");return t+=1,j(Math.round(t/o.length*100)),A.secure_url}),v=[],S=[];if(O.forEach((k,E)=>{k.ok?v.push(k.value):S.push(o[E])}),v.length){const{count:k}=await f.from("listing_photos").select("id",{count:"exact",head:!0}).eq("listing_id",c),E=typeof k=="number"?k:0,y=v.map((A,D)=>({listing_id:c,image_url:A,display_order:E+D})),{error:P}=await f.from("listing_photos").insert(y);if(P)throw P;m&&m(v)}if(S.length){d(S),i(`${S.length} photo(s) could not be uploaded. ${v.length?`${v.length} saved. `:""}Tap upload to retry the rest.`);return}n(`${v.length} photo(s) uploaded successfully.`),d([])}catch(a){console.error("Image upload error:",a),i(a.message||"Something went wrong during upload.")}finally{h(!1)}}const z=T-o.length;return e.jsxs("section",{className:"cf-image-uploader",children:[e.jsx("style",{children:`
        .cf-image-uploader {
          color: var(--cf-royal);
          width: 100%;
          font-family: inherit;
        }

        .cf-uploader-heading {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 17px;
        }

        .cf-uploader-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #1769e8;
          background: #edf4ff;
        }

        .cf-uploader-heading h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 750;
        }

        .cf-uploader-heading p {
          margin: 4px 0 0;
          color: #8290a8;
          font-size: 12px;
        }

        .cf-drop-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 27px 15px;
          min-height: 150px;
          border: 1.5px dashed #b8ccec;
          border-radius: 17px;
          background: linear-gradient(145deg, #f7faff, #eef5ff);
          transition: all .2s ease;
          cursor: pointer;
        }

        .cf-drop-zone:hover,
        .cf-drop-zone.is-dragging {
          border-color: #1769e8;
          background: #edf4ff;
          box-shadow: 0 0 0 4px rgba(23,105,232,.07);
        }

        .cf-drop-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: white;
          color: #1769e8;
          box-shadow: 0 5px 18px rgba(16,38,92,.08);
          margin-bottom: 12px;
        }

        .cf-drop-zone strong {
          font-size: 14px;
          font-weight: 750;
        }

        .cf-drop-zone small {
          color: #8290a8;
          font-size: 11px;
          margin-top: 6px;
        }

        .cf-choose-button {
          margin-top: 14px;
          border: 0;
          border-radius: 10px;
          padding: 10px 17px;
          background: #1769e8;
          color: white;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 5px 13px rgba(23,105,232,.18);
          transition: transform .2s, background .2s;
        }

        .cf-choose-button:hover {
          background: #1058cb;
          transform: translateY(-1px);
        }

        .cf-photo-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 18px 0 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .cf-photo-toolbar span:last-child {
          color: #8b99ad;
          font-weight: 500;
        }

        .cf-photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
          gap: 10px;
        }

        .cf-photo-card {
          position: relative;
          overflow: hidden;
          aspect-ratio: 1;
          border-radius: 13px;
          background: #edf2fa;
          border: 1px solid #e1e8f2;
        }

        .cf-photo-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .cf-photo-remove {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: rgba(16,38,92,.85);
          color: white;
          cursor: pointer;
          backdrop-filter: blur(8px);
        }

        .cf-photo-number {
          position: absolute;
          bottom: 6px;
          left: 6px;
          padding: 4px 7px;
          border-radius: 6px;
          background: rgba(16,38,92,.78);
          color: white;
          font-size: 10px;
        }

        .cf-upload-progress {
          margin-top: 17px;
        }

        .cf-progress-track {
          height: 7px;
          overflow: hidden;
          background: #e9eff8;
          border-radius: 20px;
          margin-top: 8px;
        }

        .cf-progress-fill {
          height: 100%;
          border-radius: 20px;
          background: linear-gradient(90deg, #1769e8, var(--cf-sky));
          transition: width .25s ease;
        }

        .cf-upload-status {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          margin-top: 14px;
          padding: 11px 13px;
          border-radius: 10px;
        }

        .cf-upload-status.success {
          color: #147a50;
          background: #ecfdf5;
        }

        .cf-upload-status.error {
          color: #bd3434;
          background: #fff1f1;
        }

        .cf-upload-submit {
          width: 100%;
          margin-top: 17px;
          padding: 13px 17px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 9px;
          border: 0;
          border-radius: 12px;
          background: #1769e8;
          color: white;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 7px 18px rgba(23,105,232,.17);
          transition: all .2s ease;
        }

        .cf-upload-submit:hover:not(:disabled) {
          background: #1058cb;
          transform: translateY(-1px);
        }

        .cf-upload-submit:disabled {
          opacity: .48;
          cursor: not-allowed;
          box-shadow: none;
        }

        .cf-uploader-footer {
          display: flex;
          justify-content: center;
          gap: 6px;
          align-items: center;
          margin-top: 12px;
          color: #94a0b2;
          font-size: 10px;
        }

        @media (max-width: 420px) {
          .cf-drop-zone {
            padding: 22px 10px;
          }
        }
      `}),e.jsxs("div",{className:"cf-uploader-heading",children:[e.jsx("div",{className:"cf-uploader-icon",children:e.jsx(ae,{size:21})}),e.jsxs("div",{children:[e.jsx("h3",{children:"Listing photos"}),e.jsx("p",{children:"Make your listing stand out."})]})]}),e.jsx("input",{ref:p,type:"file",accept:"image/jpeg,image/png,image/webp",multiple:!0,hidden:!0,disabled:s||z<=0,onChange:I}),e.jsxs("div",{className:`cf-drop-zone ${b?"is-dragging":""}`,onDragOver:t=>{t.preventDefault(),s||g(!0)},onDragLeave:t=>{t.currentTarget.contains(t.relatedTarget)||g(!1)},onDrop:H,onClick:()=>{var t;!s&&z>0&&((t=p.current)==null||t.click())},role:"button",tabIndex:s||z<=0?-1:0,onKeyDown:t=>{var a;(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),!s&&z>0&&((a=p.current)==null||a.click()))},"aria-label":"Choose or drop listing photos","aria-disabled":s||z<=0,children:[e.jsx("div",{className:"cf-drop-icon",children:e.jsx(q,{size:25})}),e.jsx("strong",{children:"Drop your photos here"}),e.jsx("small",{children:"or choose images from your device"}),e.jsxs("button",{type:"button",className:"cf-choose-button",disabled:s||z<=0,onClick:t=>{var a;t.stopPropagation(),(a=p.current)==null||a.click()},children:[e.jsx(Z,{size:14,style:{verticalAlign:"middle",marginRight:6}}),"Choose photos"]})]}),e.jsx(J,{children:o.length>0&&e.jsxs(R.div,{initial:{opacity:0,y:8},animate:{opacity:1,y:0},exit:{opacity:0,y:-5},children:[e.jsxs("div",{className:"cf-photo-toolbar",children:[e.jsx("span",{children:"Selected photos"}),e.jsxs("span",{children:[o.length," / ",T]})]}),e.jsx("div",{className:"cf-photo-grid",children:_.map((t,a)=>e.jsxs(R.div,{className:"cf-photo-card",layout:!0,initial:{opacity:0,scale:.85},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.85},children:[e.jsx("img",{src:t.url,alt:t.file.name}),e.jsxs("span",{className:"cf-photo-number",children:["Photo ",a+1]}),e.jsx("button",{type:"button",className:"cf-photo-remove",disabled:s,onClick:()=>W(a),"aria-label":`Remove ${t.file.name}`,children:e.jsx(X,{size:15})})]},`${t.file.name}-${a}`))})]})}),s&&e.jsxs("div",{className:"cf-upload-progress",children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:700},children:[e.jsx("span",{children:"Uploading your photos..."}),e.jsxs("span",{children:[x,"%"]})]}),e.jsx("div",{className:"cf-progress-track",children:e.jsx("div",{className:"cf-progress-fill",style:{width:`${x}%`}})})]}),u&&e.jsxs("div",{className:"cf-upload-status error",role:"alert",children:[e.jsx(Y,{size:16}),u]}),w&&e.jsxs("div",{className:"cf-upload-status success",role:"status",children:[e.jsx(L,{size:16}),w]}),e.jsx("button",{type:"button",className:"cf-upload-submit",onClick:G,disabled:s||o.length===0,children:s?e.jsxs(e.Fragment,{children:[e.jsx(U,{size:17,className:"cf-spin"}),"Uploading photos..."]}):e.jsxs(e.Fragment,{children:[e.jsx(q,{size:17}),"Upload ",o.length?`${o.length} photo(s)`:"photos"]})}),e.jsxs("div",{className:"cf-uploader-footer",children:[e.jsx(L,{size:12}),"JPG, PNG or WebP · Resized automatically · Maximum 5 photos"]})]})}export{ne as C,le as F,fe as L,ce as R,pe as T,de as W,ue as u};
