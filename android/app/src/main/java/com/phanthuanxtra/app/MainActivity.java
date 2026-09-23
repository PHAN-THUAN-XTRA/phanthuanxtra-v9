package com.phanthuanxtra.app;

import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import org.json.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

public class MainActivity extends Activity {
  static final String BASE="https://phanthuanxtra.com/api/admin";
  static final String SITE="https://phanthuanxtra.com/";
  static final int PICK_NEW=7, PICK_GALLERY=8;
  static final long MAX_UPLOAD_BYTES=12L*1024L*1024L;
  EditText password,carId; TextView output; AuthStore authStore; ApiClient api;
  ExecutorService executor; Handler mainHandler;
  boolean busy=false;
  static final int OBSIDIAN=Color.rgb(5,7,6), EMERALD=Color.rgb(15,95,80), EMERALD_DEEP=Color.rgb(5,47,41), EMERALD_GLOW=Color.rgb(45,154,130), GOLD=Color.rgb(199,163,90), GOLD_SOFT=Color.rgb(232,211,154), WHITE=Color.rgb(244,245,242), SILVER=Color.rgb(185,193,189);

  @Override public void onCreate(Bundle b){super.onCreate(b);authStore=new AuthStore(this);api=new ApiClient(BASE,authStore);executor=Executors.newSingleThreadExecutor();mainHandler=new Handler(Looper.getMainLooper());build();}
  int dp(float v){return Math.round(v*getResources().getDisplayMetrics().density);}
  GradientDrawable surface(int fill,int stroke,float radius){GradientDrawable g=new GradientDrawable();g.setColor(fill);g.setCornerRadius(dp(radius));g.setStroke(dp(1),stroke);return g;}
  TextView tv(String s){TextView v=new TextView(this);v.setText(s);v.setTextSize(15);v.setTextColor(WHITE);v.setPadding(dp(10),dp(9),dp(10),dp(9));return v;}
  Button btn(String label,View.OnClickListener l){Button b=new Button(this);b.setText(label);b.setTextColor(WHITE);b.setTextSize(13);b.setAllCaps(false);b.setMinHeight(dp(48));b.setPadding(dp(10),0,dp(10),0);b.setBackground(surface(EMERALD_DEEP,EMERALD,14));b.setOnClickListener(l);return b;}
  TextView section(String label){TextView v=tv(label);v.setTextColor(GOLD_SOFT);v.setTextSize(12);v.setTypeface(null,Typeface.BOLD);return v;}
  void gap(LinearLayout x,float h){Space s=new Space(this);x.addView(s,new LinearLayout.LayoutParams(1,dp(h)));}
  LinearLayout row(){LinearLayout r=new LinearLayout(this);r.setOrientation(LinearLayout.HORIZONTAL);r.setGravity(Gravity.CENTER);return r;}
  void pair(LinearLayout root,Button a,Button b){LinearLayout r=row();LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(52),1);p.setMarginEnd(dp(4));r.addView(a,p);LinearLayout.LayoutParams q=new LinearLayout.LayoutParams(0,dp(52),1);q.setMarginStart(dp(4));r.addView(b,q);root.addView(r);}
  void styleField(EditText e){e.setTextColor(WHITE);e.setHintTextColor(SILVER);e.setPadding(dp(14),0,dp(14),0);e.setMinHeight(dp(50));e.setBackground(surface(Color.rgb(7,23,20),EMERALD,14));}
  void build(){
    LinearLayout content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(dp(12),dp(12),dp(12),dp(10));content.setBackgroundColor(OBSIDIAN);
    LinearLayout top=row();Button back=btn("‹ TRANG CHỦ",v->finish());back.setTextColor(GOLD_SOFT);back.setBackground(surface(OBSIDIAN,GOLD,12));top.addView(back,new LinearLayout.LayoutParams(dp(118),dp(44)));TextView brand=tv("PHAN THUẦN XTRA");brand.setTextSize(22);brand.setGravity(Gravity.END);brand.setTypeface(null,Typeface.BOLD);brand.setTextColor(GOLD_SOFT);top.addView(brand,new LinearLayout.LayoutParams(0,dp(48),1));content.addView(top);
    TextView sub=tv("MOBILE OPERATOR HUB  •  QUẢN LÝ PHANTHUANXTRA.COM");sub.setTextSize(10);sub.setTextColor(EMERALD_GLOW);content.addView(sub);gap(content,6);
    boolean signedIn=!authStore.get().isEmpty();
    content.addView(section(signedIn?"● PHIÊN ADMIN ĐÃ LƯU AN TOÀN":"ĐĂNG NHẬP ADMIN"));
    password=new EditText(this);password.setHint(signedIn?"Nhập mật khẩu khi cần đăng nhập lại":"Mật khẩu Admin phanthuanxtra.com");password.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);styleField(password);content.addView(password);gap(content,6);
    Button login=btn("ĐĂNG NHẬP ADMIN",v->loginAdmin());login.setTextColor(OBSIDIAN);login.setBackground(surface(GOLD,GOLD_SOFT,14));
    Button logout=btn("ĐĂNG XUẤT",v->{authStore.clear();password.setText("");password.setHint("Mật khẩu Admin phanthuanxtra.com");output.setText("Đã đăng xuất và xóa phiên Admin khỏi thiết bị.");});
    pair(content,login,logout);gap(content,10);
    content.addView(section("TỔNG QUAN HỆ THỐNG"));
    pair(content,btn("DASHBOARD",v->call("GET","/dashboard",null,null,null)),btn("KHO XE",v->call("GET","/cars",null,null,null)));
    pair(content,btn("TÌM XE",v->searchCars()),btn("LEADS",v->manageLeads()));gap(content,8);
    content.addView(section("QUẢN LÝ XE"));
    carId=new EditText(this);carId.setHint("ID xe để xem / sửa / xóa");styleField(carId);content.addView(carId);gap(content,6);
    pair(content,btn("CHI TIẾT XE",v->getCar()),btn("SỬA THÔNG TIN",v->editCar()));
    pair(content,btn("GALLERY",v->manageGallery()),btn("THÊM ẢNH",v->pickGalleryImage()));
    pair(content,btn("ĐỔI TRẠNG THÁI",v->changeStatus()),btn("BẬT / TẮT NỔI BẬT",v->toggleFeatured()));
    pair(content,btn("AI NHẬP XE TỪ ẢNH",v->startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE),PICK_NEW)),btn("XÓA XE",v->confirmDelete()));
    gap(content,8);content.addView(section("ĐỒNG BỘ"));
    pair(content,btn("KIỂM TRA PHIÊN",v->callPublic("GET","/dashboard")),btn("MỞ WEBSITE",v->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(SITE)))));
    output=tv("Sẵn sàng.");output.setTextColor(SILVER);output.setBackground(surface(Color.rgb(7,17,15),EMERALD_DEEP,14));content.addView(output,new LinearLayout.LayoutParams(-1,dp(150)));
    ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.addView(content);
    LinearLayout shell=new LinearLayout(this);shell.setOrientation(LinearLayout.VERTICAL);shell.setBackgroundColor(OBSIDIAN);shell.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
    LinearLayout nav=row();nav.setPadding(dp(6),dp(5),dp(6),dp(7));nav.setBackgroundColor(Color.rgb(3,28,24));
    Button home=btn("⌂ Trang chủ",v->finish());Button cars=btn("Xe",v->call("GET","/cars",null,null,null));Button leads=btn("Leads",v->manageLeads());Button media=btn("Media",v->pickGalleryImage());
    for(Button b:new Button[]{home,cars,leads,media}){b.setTextSize(11);nav.addView(b,new LinearLayout.LayoutParams(0,dp(46),1));}
    shell.addView(nav);setContentView(shell);
  }
  void loginAdmin(){final String value=password.getText().toString();if(value.isEmpty()){output.setText("Vui lòng nhập mật khẩu Admin.");return;}runAsync(()->{try{JSONObject body=new JSONObject();body.put("password",value);String response=api.requestChecked("POST","/login",body.toString(),null,"application/json");String session=new JSONObject(response).optString("token","").trim();if(session.isEmpty())throw new Exception("Máy chủ không trả phiên Admin");authStore.save(session);ui(()->{password.setText("");password.setHint("Phiên Admin • ĐÃ LƯU");output.setText("Đăng nhập Admin thành công.");});}catch(Exception e){ui(()->output.setText("Đăng nhập thất bại: "+e.getMessage()));}});}
  void runAsync(Runnable task){if(executor==null||executor.isShutdown()||busy)return;busy=true;ui(()->output.setText("Đang xử lý..."));executor.execute(()->{try{task.run();}finally{busy=false;}});}
  void ui(Runnable task){if(isFinishing()||isDestroyed())return;mainHandler.post(()->{if(!isFinishing()&&!isDestroyed())task.run();});}
  void call(String method,String path,String json,byte[] raw,String type){runAsync(()->{try{String r=api.requestChecked(method,path,json,raw,type==null?"application/json":type);ui(()->output.setText(r));}catch(Exception e){ui(()->output.setText("Lỗi: "+e.getMessage()));}});}
  void callPublic(String method,String path){runAsync(()->{try{String r=api.requestChecked(method,path,null,null,"application/json");ui(()->output.setText(r));}catch(Exception e){ui(()->output.setText("Lỗi kết nối: "+e.getMessage()));}});}
  String selectedId(){String id=carId==null?"":carId.getText().toString().trim();if(id.isEmpty()){Toast.makeText(this,"Nhập ID xe trước",Toast.LENGTH_SHORT).show();return null;}return id;}
  void searchCars(){final EditText q=new EditText(this);q.setHint("Hãng / mẫu / ID");new AlertDialog.Builder(this).setTitle("Tìm xe").setView(q).setPositiveButton("TÌM",(d,w)->call("GET","/cars?q="+Uri.encode(q.getText().toString().trim()),null,null,null)).setNegativeButton("HỦY",null).show();}
  JSONObject fetchCar(String id)throws Exception{String r=api.requestChecked("GET","/cars/"+Uri.encode(id),null,null,"application/json");JSONObject c=new JSONObject(r).optJSONObject("car");if(c==null)throw new Exception("Không đọc được xe");return c;}
  void getCar(){String id=selectedId();if(id!=null)call("GET","/cars/"+Uri.encode(id),null,null,null);}
  void changeStatus(){String id=selectedId();if(id==null)return;final String[] values={"available","reserved","sold"};new AlertDialog.Builder(this).setTitle("Trạng thái xe").setItems(values,(d,w)->updateCarField(id,"status",values[w])).show();}
  void toggleFeatured(){String id=selectedId();if(id==null)return;runAsync(()->{try{JSONObject c=fetchCar(id);JSONObject body=carPayload(c);body.put("featured",!c.optBoolean("featured",false));String saved=api.requestChecked("PUT","/cars/"+Uri.encode(id),body.toString(),null,"application/json");ui(()->output.setText(saved));}catch(Exception e){ui(()->output.setText("Lỗi nổi bật: "+e.getMessage()));}});}
  void updateCarField(String id,String key,String value){runAsync(()->{try{JSONObject c=fetchCar(id);JSONObject body=carPayload(c);body.put(key,value);String saved=api.requestChecked("PUT","/cars/"+Uri.encode(id),body.toString(),null,"application/json");ui(()->output.setText(saved));}catch(Exception e){ui(()->output.setText("Lỗi cập nhật: "+e.getMessage()));}});}

  EditText field(String hint,String value){EditText e=new EditText(this);e.setHint(hint);e.setText(value==null?"":value);e.setSelectAllOnFocus(false);return e;}
  void editCar(){String id=selectedId();if(id==null)return;runAsync(()->{try{JSONObject c=fetchCar(id);ui(()->showEditDialog(id,c));}catch(Exception e){ui(()->output.setText("Lỗi đọc xe: "+e.getMessage()));}});}
  void showEditDialog(String id,JSONObject c){
    LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(20,0,20,0);
    EditText brand=field("Hãng",c.optString("brand"));EditText model=field("Mẫu",c.optString("model"));EditText year=field("Năm",c.has("year")?c.optString("year"):"");EditText mileage=field("Odo / km",c.has("mileage")?c.optString("mileage"):"");EditText price=field("Giá",c.has("price")?c.optString("price"):"");EditText fuel=field("Nhiên liệu",c.optString("fuel"));EditText category=field("Phân khúc",c.optString("category","suv"));EditText color=field("Màu",c.optString("color"));EditText status=field("Trạng thái",c.optString("status","available"));EditText description=field("Mô tả",c.optString("description"));EditText features=field("Tính năng (mỗi dòng một mục)",joinFeatures(c.optJSONArray("features")));EditText cover=field("Cover image URL",c.optString("cover_image"));CheckBox featured=new CheckBox(this);featured.setText("Nổi bật");featured.setChecked(c.optBoolean("featured",false));
    for(EditText e:new EditText[]{brand,model,year,mileage,price,fuel,category,color,status,description,features,cover})box.addView(e);box.addView(featured);
    ScrollView scroll=new ScrollView(this);scroll.addView(box);
    AlertDialog dlg=new AlertDialog.Builder(this).setTitle("Sửa xe: "+id).setView(scroll).setNegativeButton("HỦY",null).setPositiveButton("LƯU",null).create();
    dlg.setOnShowListener(x->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{try{JSONObject body=carPayload(c);body.put("brand",brand.getText().toString().trim());body.put("model",model.getText().toString().trim());putNumberOrNull(body,"year",year.getText().toString());putNumber(body,"mileage",mileage.getText().toString());putNumber(body,"price",price.getText().toString());body.put("fuel",fuel.getText().toString().trim());body.put("category",category.getText().toString().trim());body.put("color",color.getText().toString().trim());body.put("status",status.getText().toString().trim());body.put("description",description.getText().toString().trim());body.put("features",featuresArray(features.getText().toString()));body.put("cover_image",cover.getText().toString().trim());body.put("featured",featured.isChecked());saveCar(id,body);dlg.dismiss();}catch(Exception e){Toast.makeText(this,"Dữ liệu không hợp lệ: "+e.getMessage(),Toast.LENGTH_LONG).show();}}));dlg.show();
  }
  String joinFeatures(JSONArray a){if(a==null)return "";StringBuilder s=new StringBuilder();for(int i=0;i<a.length();i++){String x=a.optString(i,"").trim();if(!x.isEmpty()){if(s.length()>0)s.append("\\n");s.append(x);}}return s.toString();}
  JSONArray featuresArray(String s){JSONArray a=new JSONArray();for(String x:s.split("\\r?\\\n")){x=x.trim();if(!x.isEmpty())a.put(x);}return a;}
  void putNumber(JSONObject o,String k,String s)throws Exception{o.put(k,s.trim().isEmpty()?0:Double.parseDouble(s.trim()));}
  void putNumberOrNull(JSONObject o,String k,String s)throws Exception{if(s.trim().isEmpty())o.put(k,JSONObject.NULL);else o.put(k,Double.parseDouble(s.trim()));}
  void saveCar(String id,JSONObject body){runAsync(()->{try{String r=api.requestChecked("PUT","/cars/"+Uri.encode(id),body.toString(),null,"application/json");ui(()->output.setText("Đã cập nhật xe:\\n"+r));}catch(Exception e){ui(()->output.setText("Lỗi lưu xe: "+e.getMessage()));}});}

  JSONObject carPayload(JSONObject c)throws Exception{JSONObject b=new JSONObject();b.put("id",c.optString("id"));b.put("brand",c.optString("brand"));b.put("model",c.optString("model"));if(c.has("year"))b.put("year",c.opt("year"));if(c.has("mileage"))b.put("mileage",c.opt("mileage"));if(c.has("price"))b.put("price",c.opt("price"));b.put("fuel",c.optString("fuel"));b.put("category",c.optString("category","suv"));b.put("color",c.optString("color"));b.put("status",c.optString("status","available"));b.put("description",c.optString("description"));b.put("features",c.optJSONArray("features")==null?new JSONArray():c.optJSONArray("features"));b.put("featured",c.optBoolean("featured",false));b.put("cover_image",c.optString("cover_image"));JSONArray imgs=new JSONArray(),source=c.optJSONArray("images");if(source!=null)for(int i=0;i<source.length();i++){JSONObject x=source.optJSONObject(i);if(x!=null)imgs.put(x.optString("url"));else if(source.optString(i,null)!=null)imgs.put(source.optString(i));}b.put("images",imgs);return b;}
  void manageGallery(){String id=selectedId();if(id==null)return;runAsync(()->{try{JSONObject c=fetchCar(id);ui(()->showGalleryDialog(id,c));}catch(Exception e){ui(()->output.setText("Lỗi gallery: "+e.getMessage()));}});}
  void showGalleryDialog(String id,JSONObject c){JSONArray imgs=c.optJSONArray("images");final ArrayList<String> list=new ArrayList<>();if(imgs!=null)for(int i=0;i<imgs.length();i++){JSONObject x=imgs.optJSONObject(i);String u=x!=null?x.optString("url",""):imgs.optString(i,"");if(!u.isEmpty())list.add(u);}String[] labels=new String[list.size()];for(int i=0;i<list.size();i++)labels[i]=(i==0?"★ ":"")+list.get(i);new AlertDialog.Builder(this).setTitle("Gallery — chọn ảnh làm cover").setItems(labels,(d,w)->setCoverFromGallery(id,list,w)).setPositiveButton("Đóng",null).setMessage(list.isEmpty()?"Gallery trống. Hãy thêm ảnh.":"Chạm ảnh để đặt làm cover. Ảnh cover sẽ được đưa lên đầu gallery.").show();}
  void setCoverFromGallery(String id,ArrayList<String> list,int index){if(index<0||index>=list.size())return;Collections.swap(list,0,index);runAsync(()->{try{JSONObject c=fetchCar(id);JSONObject body=carPayload(c);JSONArray a=new JSONArray();for(String u:list)a.put(u);body.put("images",a);body.put("cover_image",list.get(0));String r=api.requestChecked("PUT","/cars/"+Uri.encode(id),body.toString(),null,"application/json");ui(()->output.setText("Đã chọn cover:\\n"+r));}catch(Exception e){ui(()->output.setText("Lỗi chọn cover: "+e.getMessage()));}});}
  void pickGalleryImage(){if(selectedId()==null)return;startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE),PICK_GALLERY);}
  void addGalleryUrl(String id,String url){runAsync(()->{try{JSONObject c=fetchCar(id);JSONObject body=carPayload(c);JSONArray a=body.optJSONArray("images");if(a==null)a=new JSONArray();a.put(url);body.put("images",a);if(body.optString("cover_image","").isEmpty())body.put("cover_image",url);String r=api.requestChecked("PUT","/cars/"+Uri.encode(id),body.toString(),null,"application/json");ui(()->output.setText("Đã thêm ảnh gallery:\\n"+r));}catch(Exception e){ui(()->output.setText("Lỗi thêm gallery: "+e.getMessage()));}});}
  void processGalleryImage(Uri u){String galleryId=selectedId();if(galleryId==null)return;UploadPayload upload=null;try{upload=prepareUpload(u);String up;try(InputStream in=upload.open()){up=api.requestCheckedStream("POST","/media",in,upload.length,upload.contentType);}String image=new JSONObject(up).optString("url","");if(image.isEmpty())throw new Exception("Media API không trả URL");addGalleryUrl(galleryId,image);}catch(Exception e){ui(()->output.setText("Lỗi upload gallery: "+e.getMessage()));}finally{if(upload!=null)upload.delete();}}

  void manageLeads(){
    runAsync(()->{
      try{
        String r=api.requestChecked("GET","/leads",null,null,"application/json");
        JSONObject root=new JSONObject(r);
        JSONArray list=root.optJSONArray("leads");
        ui(()->showLeadList(list));
      }catch(Exception e){ui(()->output.setText("Lỗi leads: "+e.getMessage()));}
    });
  }

  void showLeadList(JSONArray list){
    if(list==null||list.length()==0){output.setText("Chưa có lead.");return;}
    String[] labels=new String[list.length()];
    for(int i=0;i<list.length();i++){
      JSONObject l=list.optJSONObject(i);
      if(l==null) labels[i]="Lead #"+(i+1);
      else labels[i]="#"+l.optInt("id")+"  "+l.optString("name","Khách hàng")+"  •  "+l.optString("status","new")+"\n"+l.optString("phone","");
    }
    new AlertDialog.Builder(this).setTitle("Lead CRM • "+list.length()).setItems(labels,(d,w)->showLeadActions(list.optJSONObject(w))).setNegativeButton("Đóng",null).show();
  }

  void showLeadActions(JSONObject lead){
    if(lead==null)return;
    int id=lead.optInt("id");
    if(id<1)return;
    String[] actions={"Đánh dấu đã liên hệ","Đánh dấu tiềm năng","Đã chốt","Không phù hợp","Xóa lead"};
    new AlertDialog.Builder(this).setTitle("Lead #"+id)
      .setMessage(lead.optString("name","Khách hàng")+"\n"+lead.optString("phone","")+"\n"+lead.optString("message",""))
      .setItems(actions,(d,w)->{if(w==4)deleteLead(id);else updateLead(id,new String[]{"contacted","qualified","won","lost"}[w]);})
      .setNegativeButton("Đóng",null).show();
  }

  void updateLead(int id,String status){
    runAsync(()->{
      try{
        JSONObject body=new JSONObject();
        body.put("id",id);
        body.put("status",status);
        body.put("note","Cập nhật từ Android Admin");
        String r=api.requestChecked("PUT","/leads",body.toString(),null,"application/json");
        ui(()->output.setText("Đã cập nhật lead #"+id+"\n"+r));
      }catch(Exception e){ui(()->output.setText("Lỗi cập nhật lead: "+e.getMessage()));}
    });
  }

  void deleteLead(int id){
    new AlertDialog.Builder(this).setTitle("Xóa lead?")
      .setMessage("Lead #"+id+" sẽ bị xóa vĩnh viễn.")
      .setNegativeButton("Hủy",null)
      .setPositiveButton("Xóa",(d,w)->runAsync(()->{
        try{
          JSONObject body=new JSONObject();
          body.put("id",id);
          String r=api.requestChecked("DELETE","/leads",body.toString(),null,"application/json");
          ui(()->output.setText("Đã xóa lead #"+id+"\n"+r));
        }catch(Exception e){ui(()->output.setText("Lỗi xóa lead: "+e.getMessage()));}
      })).show();
  }

  void confirmDelete(){String id=selectedId();if(id==null)return;new AlertDialog.Builder(this).setTitle("Xóa xe?").setMessage("Xóa vĩnh viễn xe "+id+" khỏi kho. Không thể hoàn tác.").setNegativeButton("HỦY",null).setPositiveButton("XÓA",(d,w)->call("DELETE","/cars/"+Uri.encode(id),null,null,null)).show();}
  @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(result!=RESULT_OK||data==null)return;Uri u=data.getData();if(u==null)return;if(req==PICK_NEW)runAsync(()->processImage(u));else if(req==PICK_GALLERY)runAsync(()->processGalleryImage(u));}
  void processImage(Uri u){UploadPayload upload=null;try{upload=prepareUpload(u);String type=upload.contentType;String analysis;try(InputStream in=upload.open()){analysis=api.requestCheckedStream("POST","/vehicle/analyze",in,upload.length,type);}JSONObject wrapper=new JSONObject(analysis),a=wrapper.optJSONObject("analysis");if(a==null)throw new Exception("AI không trả analysis");String brand=a.optString("brand","").trim(),model=a.optString("model","").trim();if(brand.isEmpty()||model.isEmpty())throw new Exception("AI chưa xác định được hãng/mẫu; không tự bịa dữ liệu.");String up;try(InputStream in=upload.open()){up=api.requestCheckedStream("POST","/media",in,upload.length,type);}String image=new JSONObject(up).optString("url","");if(image.isEmpty())throw new Exception("Media API không trả URL");JSONObject car=new JSONObject();String id=(brand+"-"+model+"-"+System.currentTimeMillis()).toLowerCase(Locale.US).replaceAll("[^a-z0-9-]","-");car.put("id",id);car.put("brand",brand);car.put("model",model);put(car,"year",a,"year");put(car,"mileage",a,"mileage");put(car,"price",a,"price");put(car,"fuel",a,"fuel");put(car,"category",a,"category");put(car,"color",a,"color");put(car,"description",a,"description");car.put("features",a.optJSONArray("features")==null?new JSONArray():a.optJSONArray("features"));car.put("status","available");JSONArray imgs=new JSONArray();imgs.put(image);car.put("images",imgs);car.put("cover_image",image);String saved=api.requestChecked("POST","/cars",car.toString(),null,"application/json");ui(()->output.setText("AI:\\n"+a.toString()+"\\n\\nUPLOAD:\\n"+up+"\\n\\nXE:\\n"+saved));}catch(Exception e){ui(()->output.setText("Lỗi AI/nhập xe: "+e.getMessage()));}finally{if(upload!=null)upload.delete();}}
  void put(JSONObject out,String key,JSONObject in,String src)throws Exception{Object v=in.opt(src);if(v!=null&&v!=JSONObject.NULL)out.put(key,v);}

  /** Spools one selected image to app cache with a strict 12 MiB cap, avoiding a heap-sized byte[]. */
  UploadPayload prepareUpload(Uri u)throws Exception{String type=getContentResolver().getType(u);if(type==null||!type.startsWith("image/"))throw new Exception("Chỉ hỗ trợ tệp ảnh");File file=File.createTempFile("pxtra-upload-",".bin",getCacheDir());long total=0;try(InputStream in=getContentResolver().openInputStream(u);OutputStream out=new BufferedOutputStream(new FileOutputStream(file))){if(in==null)throw new Exception("Không mở được ảnh");byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){total+=n;if(total>MAX_UPLOAD_BYTES)throw new Exception("Ảnh vượt 12MB");out.write(buffer,0,n);}}catch(Exception e){if(!file.delete())file.deleteOnExit();throw e;}return new UploadPayload(file,total,type);}
  static final class UploadPayload{final File file;final long length;final String contentType;UploadPayload(File file,long length,String contentType){this.file=file;this.length=length;this.contentType=contentType;}InputStream open()throws Exception{return new BufferedInputStream(new FileInputStream(file));}void delete(){if(file.exists()&&!file.delete())file.deleteOnExit();}}

  @Override protected void onDestroy(){if(executor!=null)executor.shutdownNow();super.onDestroy();}
}
