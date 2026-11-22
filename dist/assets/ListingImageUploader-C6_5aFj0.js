import{c as w,s as f,X,x as Y,C as L,L as W,y as B}from"./index-oFp7WVkt.js";import{a as c,j as e,A as J,m as R}from"./vendor-motion-CvgbSNa8.js";import{I as K,a as V,r as Z,M as Q}from"./imageTools-DxPUEjpv.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const re=w("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=w("CloudUpload",[["path",{d:"M12 13v8",key:"1l5pq0"}],["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242",key:"1pljnt"}],["path",{d:"m8 17 4-4 4 4",key:"1quai1"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ie=w("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ee=w("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=w("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const le=w("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);function ce({chargeId:p,onStatus:k,timeoutMs:g=9e4}){const r=c.useRef(k);r.current=k,c.useEffect(()=>{if(!p)return;let d=!0,s=null,h=null;function b(n){var l;d&&(d=!1,(l=r.current)==null||l.call(r,n),s&&f.removeChannel(s),h&&clearTimeout(h))}async function M(){const{data:n,error:l}=await f.from("payments").select("status").eq("charge_id",p).maybeSingle();!d||l||!n||(n.status==="successful"||n.status==="failed")&&b(n.status)}function j(n){var i;const l=(i=n.new)==null?void 0:i.status;(l==="successful"||l==="failed")&&b(l)}return M(),s=f.channel(`payment-${p}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"payments",filter:`charge_id=eq.${p}`},j).on("postgres_changes",{event:"INSERT",schema:"public",table:"payments",filter:`charge_id=eq.${p}`},j).subscribe(),h=setTimeout(()=>{d&&b("timeout")},g),()=>{d=!1,s&&f.removeChannel(s),h&&clearTimeout(h)}},[p,g])}const S=5,te=Q;function pe({listingId:p,onUploaded:k}){const g=c.useRef(null),[r,d]=c.useState([]),[s,h]=c.useState(!1),[b,M]=c.useState(0),[j,n]=c.useState(""),[l,i]=c.useState(""),[$,T]=c.useState(!1),[U,q]=c.useState([]);c.useEffect(()=>{const t=r.map(o=>({file:o,url:URL.createObjectURL(o)}));return q(t),()=>{t.forEach(o=>URL.revokeObjectURL(o.url))}},[r]);function D(t){i(""),n("");const o=Array.from(t||[]),v=[];for(const a of o){if(!["image/jpeg","image/png","image/webp"].includes(a.type)){i("Please choose JPG, PNG or WebP images.");continue}if(a.size>te){i(`${a.name} is too large (max 25 MB).`);continue}v.push(a)}d(a=>{const z=S-a.length;return v.length>z&&i(`You can add only ${z} more image(s).`),[...a,...v].slice(0,S)})}function F(t){D(t.target.files),t.target.value=""}function I(t){d(o=>o.filter((v,a)=>a!==t)),i("")}function H(t){t.preventDefault(),T(!1),s||D(t.dataTransfer.files)}async function G(){if(!B||!f){i("Supabase is not configured.");return}if(!p){i("Create a listing before uploading its photos.");return}if(!r.length){i("Choose at least one image.");return}let t=0;h(!0),M(0),i(""),n("");try{const{data:o}=await f.auth.getSession();if(!(o==null?void 0:o.session))throw new Error("Please sign in before uploading images.");const{data:a,error:z}=await f.functions.invoke("cloudinary-sign");if(z)throw z;if(!(a!=null&&a.signature))throw new Error("Could not obtain an upload signature.");const O=await V(r,3,async x=>{var P;const C=await Z(x),u=new FormData;u.append("file",C),u.append("api_key",a.api_key),u.append("timestamp",String(a.timestamp)),u.append("folder",a.folder),u.append("signature",a.signature),a.allowed_formats&&u.append("allowed_formats",a.allowed_formats);const _=await fetch(`https://api.cloudinary.com/v1_1/${a.cloud_name}/image/upload`,{method:"POST",body:u}),E=await _.json();if(!_.ok)throw new Error(((P=E.error)==null?void 0:P.message)||"Cloudinary upload failed.");return t+=1,M(Math.round(t/r.length*100)),E.secure_url}),m=[],N=[];if(O.forEach((x,C)=>{x.ok?m.push(x.value):N.push(r[C])}),m.length){const{count:x}=await f.from("listing_photos").select("id",{count:"exact",head:!0}).eq("listing_id",p),C=typeof x=="number"?x:0,u=m.map((E,P)=>({listing_id:p,image_url:E,display_order:C+P})),{error:_}=await f.from("listing_photos").insert(u);if(_)throw _;k&&k(m)}if(N.length){d(N),i(`${N.length} photo(s) could not be uploaded. ${m.length?`${m.length} saved. `:""}Tap upload to retry the rest.`);return}n(`${m.length} photo(s) uploaded successfully.`),d([])}catch(o){console.error("Image upload error:",o),i(o.message||"Something went wrong during upload.")}finally{h(!1)}}const y=S-r.length;return e.jsxs("section",{className:"cf-image-uploader",children:[e.jsx("style",{children:`
        .cf-image-uploader {
          color: #10265c;
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
          background: linear-gradient(90deg, #1769e8, #64b5f6);
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
      `}),e.jsxs("div",{className:"cf-uploader-heading",children:[e.jsx("div",{className:"cf-uploader-icon",children:e.jsx(ee,{size:21})}),e.jsxs("div",{children:[e.jsx("h3",{children:"Listing photos"}),e.jsx("p",{children:"Make your listing stand out."})]})]}),e.jsx("input",{ref:g,type:"file",accept:"image/jpeg,image/png,image/webp",multiple:!0,hidden:!0,disabled:s||y<=0,onChange:F}),e.jsxs("div",{className:`cf-drop-zone ${$?"is-dragging":""}`,onDragOver:t=>{t.preventDefault(),s||T(!0)},onDragLeave:t=>{t.currentTarget.contains(t.relatedTarget)||T(!1)},onDrop:H,onClick:()=>{var t;!s&&y>0&&((t=g.current)==null||t.click())},role:"button",tabIndex:s||y<=0?-1:0,onKeyDown:t=>{var o;(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),!s&&y>0&&((o=g.current)==null||o.click()))},"aria-label":"Choose or drop listing photos","aria-disabled":s||y<=0,children:[e.jsx("div",{className:"cf-drop-icon",children:e.jsx(A,{size:25})}),e.jsx("strong",{children:"Drop your photos here"}),e.jsx("small",{children:"or choose images from your device"}),e.jsxs("button",{type:"button",className:"cf-choose-button",disabled:s||y<=0,onClick:t=>{var o;t.stopPropagation(),(o=g.current)==null||o.click()},children:[e.jsx(K,{size:14,style:{verticalAlign:"middle",marginRight:6}}),"Choose photos"]})]}),e.jsx(J,{children:r.length>0&&e.jsxs(R.div,{initial:{opacity:0,y:8},animate:{opacity:1,y:0},exit:{opacity:0,y:-5},children:[e.jsxs("div",{className:"cf-photo-toolbar",children:[e.jsx("span",{children:"Selected photos"}),e.jsxs("span",{children:[r.length," / ",S]})]}),e.jsx("div",{className:"cf-photo-grid",children:U.map((t,o)=>e.jsxs(R.div,{className:"cf-photo-card",layout:!0,initial:{opacity:0,scale:.85},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.85},children:[e.jsx("img",{src:t.url,alt:t.file.name}),e.jsxs("span",{className:"cf-photo-number",children:["Photo ",o+1]}),e.jsx("button",{type:"button",className:"cf-photo-remove",disabled:s,onClick:()=>I(o),"aria-label":`Remove ${t.file.name}`,children:e.jsx(X,{size:15})})]},`${t.file.name}-${o}`))})]})}),s&&e.jsxs("div",{className:"cf-upload-progress",children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:700},children:[e.jsx("span",{children:"Uploading your photos..."}),e.jsxs("span",{children:[b,"%"]})]}),e.jsx("div",{className:"cf-progress-track",children:e.jsx("div",{className:"cf-progress-fill",style:{width:`${b}%`}})})]}),l&&e.jsxs("div",{className:"cf-upload-status error",role:"alert",children:[e.jsx(Y,{size:16}),l]}),j&&e.jsxs("div",{className:"cf-upload-status success",role:"status",children:[e.jsx(L,{size:16}),j]}),e.jsx("button",{type:"button",className:"cf-upload-submit",onClick:G,disabled:s||r.length===0,children:s?e.jsxs(e.Fragment,{children:[e.jsx(W,{size:17,className:"cf-spin"}),"Uploading photos..."]}):e.jsxs(e.Fragment,{children:[e.jsx(A,{size:17}),"Upload ",r.length?`${r.length} photo(s)`:"photos"]})}),e.jsxs("div",{className:"cf-uploader-footer",children:[e.jsx(L,{size:12}),"JPG, PNG or WebP · Resized automatically · Maximum 5 photos"]})]})}export{re as C,ie as F,pe as L,ne as R,le as T,ce as u};
