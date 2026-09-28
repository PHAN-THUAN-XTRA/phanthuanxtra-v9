/* Shared publishing API for the authenticated Admin editor. */
(() => {
  const byId=id=>document.getElementById(id);
  const make=(tag,text)=>{const element=document.createElement(tag);if(text!=null)element.textContent=text;return element;};
  let saving=false,requestId=crypto.randomUUID();
  const toolbar=byId('savePost').parentElement;
  const draftButton=make('button','Lưu nháp'),publishButton=make('button','Xuất bản');
  draftButton.className='btn';publishButton.className='btn primary';
  draftButton.id='saveDraftPost';publishButton.id='publishPost';
  toolbar.prepend(draftButton,publishButton);
  const upload=make('input');upload.type='file';upload.accept='image/jpeg,image/png,image/webp';upload.id='postCoverFile';
  const label=make('label','Chọn ảnh cover từ điện thoại hoặc máy tính');label.htmlFor=upload.id;
  const uploadBox=make('div');uploadBox.className='field';uploadBox.append(label,upload);
  byId('p_cover').parentElement.after(uploadBox);
  const preview=make('div');preview.className='panel';preview.hidden=true;
  const previewButton=make('button','Xem trước');previewButton.className='btn';toolbar.prepend(previewButton);
  byId('postMsg').after(preview);
  previewButton.onclick=()=>{
    preview.replaceChildren();preview.hidden=false;
    preview.append(make('h2',byId('p_title').value),make('p',byId('p_excerpt').value));
    const source=byId('p_cover').value;
    if(/^\/media\/[A-Za-z0-9/_.-]+$/.test(source)&&!source.includes('..')){const img=make('img');img.src=source;img.alt=byId('p_title').value;img.style.maxWidth='100%';preview.append(img);}
    const body=make('div',byId('p_content').value);body.style.whiteSpace='pre-wrap';preview.append(body);
  };
  function resultMessage(data){
    const box=byId('postMsg');box.textContent=data.post.status==='published'?'Đã xuất bản. ':'Đã lưu bản nháp. ';
    const url=data.public_url||data.post.url;
    if(url){const link=make('a','Mở bài trên website');link.href=url;link.target='_blank';link.rel='noopener';box.append(link);}
  }
  async function save(status){
    if(saving)return;saving=true;
    const controls=[byId('savePost'),draftButton,publishButton,upload];controls.forEach(x=>x.disabled=true);
    try{
      let id=byId('p_id').value;
      if(upload.files?.[0]){
        const file=upload.files[0];if(file.size>10*1024*1024)throw Error('Ảnh vượt quá 10 MiB.');
        byId('postMsg').textContent='Đang tải ảnh...';
        const response=await fetch('/api/publish/v1/media',{method:'POST',headers:{Authorization:'Bearer '+token,'content-type':file.type},body:file,signal:AbortSignal.timeout(25000)});
        const data=await response.json();if(!response.ok)throw Error(data.error||'Không tải được ảnh.');
        byId('p_cover').value=data.url;upload.value='';
      }
      const body={title:byId('p_title').value,slug:byId('p_slug').value,category:byId('p_category').value,cover_image:byId('p_cover').value,excerpt:byId('p_excerpt').value,content:byId('p_content').value,tags:byId('p_tags').value.split(',').map(x=>x.trim()).filter(Boolean)};
      let data;
      if(!id){data=await api('/api/publish/v1/posts',{method:'POST',body:JSON.stringify({...body,request_id:requestId,status:'draft'})});}
      else{data=await api('/api/admin/posts/'+id,{method:'PUT',body:JSON.stringify({...body,status})});}
      id=String(data.id);byId('p_id').value=id;
      if(body.slug.trim() && body.slug.trim()!==data.post.slug)data=await api('/api/admin/posts/'+id,{method:'PUT',body:JSON.stringify({...body,status:data.post.status})});
      byId('p_slug').value=data.post.slug;
      if(status==='published')data=await api('/api/publish/v1/posts/'+id+'/publish',{method:'POST',body:'{}'});
      byId('p_status').value=data.post.status;resultMessage(data);await loadPosts();
    }catch(error){byId('postMsg').textContent=error.message;}
    finally{saving=false;controls.forEach(x=>x.disabled=false);}
  }
  byId('savePost').onclick=()=>save(byId('p_status').value);
  draftButton.onclick=()=>save('draft');publishButton.onclick=()=>save('published');
  byId('newPost').onclick=()=>{if(saving)return;requestId=crypto.randomUUID();upload.value='';preview.hidden=true;editPost(null);};
  // Replace the legacy single-element .forEach binding with explicit DOM rows.
  renderPosts=()=>{
    const container=byId('postTable');container.replaceChildren();
    if(!posts.length){container.append(make('p','Chưa có bài viết.'));return;}
    const table=make('table');table.className='table';const head=make('tr');
    ['Tiêu đề','Chuyên mục','Trạng thái','Thao tác'].forEach(x=>head.append(make('th',x)));table.append(head);
    for(const post of posts){
      const row=make('tr');[post.title,post.category||'',post.status].forEach(x=>row.append(make('td',x)));
      const actions=make('td'),edit=make('button','Sửa');edit.className='btn';edit.onclick=()=>{if(saving)return;upload.value='';preview.hidden=true;editPost(post);};actions.append(edit);
      if(post.status==='published'){const link=make('a',' Mở bài');link.href='/blog/'+encodeURIComponent(post.slug);link.target='_blank';link.rel='noopener';actions.append(link);}
      row.append(actions);table.append(row);
    }
    container.append(table);
  };
  renderPosts();
})();
