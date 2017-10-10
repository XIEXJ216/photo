// 引入模块搭建页面
var express = require("express");
var body = require("body-parser");
var formidable = require("formidable");
var session =  require("express-session");
var mongo = require("mongodb");
var fs = require("fs");
var gm = require("gm");
var mongoClient  = mongo.MongoClient; 
var connect_str = "mongodb://localhost:27017/ickt7";
var app = express();
app.use(session({
  secret:"asdfoiahfoiwah",
  resave:false,
  saveUninitialized:true,
}));
app.use(express.static("./albums"));
app.use(body.urlencoded({extended:false}));
app.use(express.static("./sta"));
// 跳转到登录页面的路由
app.get("/login",function(req,res){
  res.render("./login.ejs",{
    url:"/login",
    gongneng:"登录"
  });
});
// 跳转到注册页面的路由
app.get("/regist",function(req,res){
  res.render("./login.ejs",{
    url:"/regist",
    gongneng:"注册"
  });
}); 
// 登陆路由
app.post("/login",function(req,res){
  var username = req.body.username;
  var password = req.body.password;
  // 连接数据库
  mongoClient.connect(connect_str,function(err,db){
    if(err){
      // 说明数据库没有打开 
      // 服务器异常
      res.status(500).send("连接数据库失败");
      return;
    }
    // 说明没有异常 数据库正常打开
    var obj = {
      username:username,
      password:password
    }
    db.collection("students").findOne(obj,function(err,data){
      if(err){
        // 查询数据库失败
        res.status(500).send("查询数据库失败");
        // 关闭数据库
        db.close();
        return;
      }
      db.close();
      if(data===null){
        // 说明没有用户
        res.redirect("/login"); 
      }else{
        // 有用户
        req.session.username = username;
        req.session.head_pic = data.head_pic;
        res.redirect("/main.html");
      } 
    });
  });
});
// 注册路由
app.post("/regist",function(req,res){
  // 第一步获取前端提交过来的数据
  var formid = new formidable.IncomingForm();
  formid.uploadDir  = "./uploads";
  formid.parse(req,function(err,fields,files){
    if(err){
      res.send("抱歉，解析上传数据失败");
      return;
    }
    // 得到上传的数据
    var username = fields.username;
    var password = fields.password;
    fs.mkdir("./albums/"+username,function(err){
      if(err){
        res.send("创建文件夹失败");
        return;
      }
      fs.mkdir("./albums/"+username+"/head_pic",function(error){
        if(err){
          res.send("创建头像文件夹失败");
          return;
        }
        var ext = files.head_pic.name.slice(files.head_pic.name.lastIndexOf("."));
        if(!files.head_pic.size){
          // 没上传文件
          // 更改文件名的时候 源地址要改变
          files.head_pic.path = "./sta/imgs/default/111.jpg";
          ext = ".jpg";
          fs.readFile("./sta/imgs/default/default.jpg",function(err,data){
            if(err){
              // 读取头像失败
              res.send("读取头像失败");
              return;
            }
            // 读取成功 开始复制
            fs.appendFile("./sta/imgs/default/111.jpg",data,function(err){
              if(err){
                res.send("复制文件失败");
                return;
              } 
            // 判断用户是否上传文件
            if(!files.head_pic.size){
              // 没上传文件
              // 更改文件名的时候 源地址要改变
              files.head_pic.path = "./sta/imgs/default/111.jpg";
              ext = ".jpg";
            }
            var newPath = username+"/head_pic/"+"head_pic"+ext;
            fs.rename(files.head_pic.path,"./albums/"+newPath,function(err){
              if(err){
                res.send("头像文件改名失败");
                return;
              }
              // 往数据库中插入数据
              mongoClient.connect(connect_str,function(err,db){
                if(err){
                  res.send("连接数据库失败");
                  return;
                }
                db.collection("students").insertOne({username:username,password:password,head_pic:newPath},function(err,data){
                  if(err){
                    res.send("插入数据失败");
                    db.close();
                    return;
                  }
                  db.close();
                  // 将信息放入session并跳转页面
                  req.session.username = username;
                  req.session.head_pic = newPath;
                  //到目前为止 注册路由做的事情就完成了。剩余的事情要交给/main.html路由来做。
                  // 因为如果直接在这里render的话。那么前端显示的路由将会是 http://localhost:3000/regist 那么如果重新刷新页面的话。将会又引发一次注册。所以将路由更改指向。那么刷新的时候就不会再次注册
                  res.redirect("/main.html");
                });
              });
            });
            })
         })
        }else{  
            var newPath = username+"/head_pic/"+"head_pic"+ext;
            fs.rename(files.head_pic.path,"./albums/"+newPath,function(err){
              if(err){
                res.send("头像文件改名失败");
                return;
              }
              // 往数据库中插入数据
              mongoClient.connect(connect_str,function(err,db){
                if(err){
                  res.send("连接数据库失败");
                  return;
                }
                db.collection("students").insertOne({username:username,password:password,head_pic:newPath},function(err,data){
                  if(err){
                    res.send("插入数据失败");
                    db.close();
                    return;
                  }
                  db.close();
                  // 将信息放入session并跳转页面
                  req.session.username = username;
                  req.session.head_pic = newPath;
                  //到目前为止 注册路由做的事情就完成了。剩余的事情要交给/main.html路由来做。
                  res.redirect("/main.html");
                });
              });
            });
        }
      });
    });
  });
}); 
app.use("*",function(req,res,next){
  console.log("进入任何路由都要经过我");
   if(!req.session.username){
     // 说明没有登录
     res.redirect("/");
   }else{
     next();
   }
})
// 检测用户名路由
app.get("/checkusername",function(req,res){
  // 得到用户传递的数据
  var username = req.query.username;
  mongoClient.connect(connect_str,function(err,db){
    if(err){
      res.send({
        error:1,
        data:"抱歉，连接数据库失败"
      });
      return;
    }
    // 检测数据
    var obj = {username:username};
    db.collection("students").findOne(obj,function(err,data){
      if(err){
        res.send({
          error:2,
          data:"抱歉，查询数据库失败"
        });
        db.close();
        return;
      }
      db.close();
      if(data===null){
        res.send({error:0,data:"恭喜，可以注册"});
      }else{
        res.send({error:3,data:"抱歉，已经被人注册了"});
      }
    });
  });
});
app.get("/main.html",function(req,res){
  res.render("./main.ejs",{
     username:req.session.username,          
     head_pic:req.session.head_pic
  });
}); 
// 管理相册路由
app.get("/manage",function(req,res){
  var username = req.session.username;
  fs.readdir("./albums/"+username,function(err,data){
    if(err){
      res.send("读取失败");
      return;
    }
    res.render("./manage.ejs",{
      username:req.session.username,          
      head_pic:req.session.head_pic,
      albums:data
    })
  })
});
// 创建相册路由
app.get("/create_album",function(req,res){
  // 得到前端数据
  var album_name = req.query.album_name;
  fs.mkdir("./albums/"+req.session.username+"/"+album_name,function(err){
    if(err){
      res.json({error:1,data:"创建相册失败"});
      return;
    }
    res.json({error:0,data:"创建相册成功"})
  })
});
// 获取某一个相册的路由
app.get("/getAlbumContent",function(req,res){
  // 得到前端数据
  var album_name = req.query.album_name;
  var username = req.session.username;
  // 读取数据库中的信息
  var obj ={username:req.session.username,album_name:album_name};
  // 连接数据库
  mongoClient.connect(connect_str,function(err,db){
    if(err){
      res.send("连接数据库失败");
      return;
    }
    db.collection("usersAlbumInfo").find(obj).toArray(function(err,data){
      if(err){
        res.send("查询数据失败");
        db.close();
        return;
      }
      db.close();
      res.json({
        error:0,
        data:data,
        username:username
      })
    })

  })
})
// 上传文件的路由
app.post("/uploads",function(req,res){
  //上传文件使用formidable
  var formid = new formidable.IncomingForm();
  formid.uploadDir = "./uploads";
  formid.parse(req,function(err,fields,files){
    if(err){
      res.send("抱歉，解析上传数据失败");
      return;
    }
    fs.rename(files.upload.path,"./albums/"+req.session.username+"/"+fields.album_name+"/"+files.upload.name,function(err){
      if(err){
        res.send("抱歉，文件改名失败");
        return;
      }
      // 往数据库中权限集合中添加一条信息
      mongoClient.connect(connect_str,function(err,db){
        if(err){
          res.end("连接数据库失败");
          return;
        }
        // 定义数据
        var info = {username:req.session.username,album_name:fields.album_name,filename:files.upload.name,share:"false"};
        console.log(info);
        db.collection("usersAlbumInfo").insertOne(info,function(err,data){
          if(err){
            res.end("插入数据失败");
            db.close();
            return;
          }
          db.close();
          res.redirect("/manage");  
        })
      })
    })
  }) 
});
// 获取所有相册
app.get("/all_albums",function(req,res){
  // 直接读取所有用户的名字并返回 
  fs.readdir("./albums",function(err,data){
    if(err){
      res.send("抱歉，读取用户失败");
      return;
    }
    // 创建一个新的空数组
    var arr = [];
    // 循环读取每一个用户的头像图片名字
    for(var i =0;i<data.length;i++){
     var head_pic_name  = fs.readdirSync("./albums/"+data[i]+"/head_pic")[0];
     arr.push({username:data[i],head_pic:head_pic_name});
     console.log({username:data[i],head_pic:head_pic_name})
    }
    res.render("./all_albums.ejs",{
      data:arr,
      username:req.session.username,
      head_pic:req.session.head_pic
    }) 
  })
});
// 单独查看某一个用户的相册
app.get("/show_user_albums",function(req,res){
  // 用户点击了全部相册中的某一个用户的相册 要展示该用户的所有相册目录
  var username = req.query.username;
  fs.readdir("./albums/"+username,function(err,data){
    if(err){
      res.send("读取目录失败");
      return;
    }
    res.render("./user_albums.ejs",{
      username:req.session.username,
      head_pic:req.session.head_pic,
      data:data,
      person:username
    })
  })
});
// 查看某一个用户的某一个相册
app.get("/choose_album",function(req,res){
  // 用户名
  var person = req.query.username;
  var album_name = req.query.album_name;
  // 读取对应的相册
  fs.readdir("./albums/"+person+"/"+album_name,function(err,data){
    if(err){
      res.send("读取相册失败");
      return;
    }
    var arr =data;
    // 到数据库中查询该相册的所有图片共享状态信息 然后匹配每一条 然后将所有share属性为false的都剔除
    mongoClient.connect(connect_str,function(err,db){
      if(err){
        res.send("连接数据库失败");
        return;
      }
      var obj = {username:person,album_name:album_name,share:"false"};
      console.log(obj)
      db.collection("usersAlbumInfo").find(obj).toArray(function(err,data){
        if(err){
          res.send("转换为数组的时候或者查询的时候失败");
          db.close();
          return;
        }
        db.close();
        // console.log("所有不共享的图片集合",data);
        // console.log("所有图片集合",arr);
        if(!(req.session.username === person) ){
          for(var i =0;i<data.length;i++){
            for(var j =0;j<arr.length;j++){
              if(arr[j]===data[i].filename){
                console.log(arr[j],data[i].filename)
                arr.splice(j,1);
                break;
              }
            }
          }  
        }
        // console.log("所有共享的图片集合",arr);
        res.render("./choose_album.ejs",{
          username:req.session.username,
          head_pic:req.session.head_pic,
          data:arr,
          person:person,
          album_name:album_name
        }); 
      })
    })
  })
});
// 更改权限的路由
app.get("/change_quanxian",function(req,res){ 
  // 得到前端传递的数据
  var username = req.session.username;
  var album_name = req.query.album_name;
  var filename = req.query.filename;
  var state = req.query.state;
  // 连接数据库
  mongoClient.connect(connect_str,function(err,db){
    if(err){
      res.send({error:1,data:"连接数据库失败"});
      return;
    }
    var tiaojian = {
      username:username,
      album_name:album_name,
      filename:filename
    }
    db.collection("usersAlbumInfo").updateOne(tiaojian,{username:username,
      album_name:album_name,
      filename:filename,share:state},function(err,data){
        if(err){
          res.send({"error":2,data:"修改数据失败"});
          db.close();
          return;
        }
        // console.log(data);
        db.close();
        if(data.result.ok){
          res.send({"error":0,data:"修改成功"});
        }else{
          res.send({"error":3,data:"不知道出什么情况了"});
        }
      })
  })
});
app.get("/exit",function(req,res){
  req.session.username = "";
  res.redirect("/main.html");
});
app.get("/cut",function(req,res){
  res.render("./cut.ejs",{
    head_pic:req.session.head_pic
  })
})
app.get("/crop",function(req,res){
  var x,y,w,h;
  x= req.query.x;
  y= req.query.y;
  w= req.query.w;
  h= req.query.h;
  console.log(x,y,w,h);
  gm("./albums/"+req.session.head_pic).crop(w,h,x,y).write("./albums/"+req.session.head_pic,function(err){
    if(err){
      res.send({"error":1,data:"剪切失败"});
      return;
    }
    res.send({"error":0,data:"剪切成功"})
  })
});
// 更改密码页面
app.get("/updatePassword",function(req,res){
  res.render("./update.ejs",{
    username:req.session.username,
    head_pic:req.session.head_pic
  });
});
//更改密码的路由
app.post("/update",function(req,res){
  var newPsd = req.body.newPsd;
  var obj = {username:req.session.username};
  mongoClient.connect(connect_str,function(err,db){
    if(err){
      res.send("连接数据库失败");
      return;
    }
    db.collection("students").updateOne(obj,{$set:{password:newPsd}},function(err,data){
      if(err){
        res.send("修改密码失败");
        db.close();
        return;
      }
      res.redirect("./main.html");
    })
  })
})
// 检测密码的路由
app.post("/check_psd",function(req,res){
  var oldPsd = req.body.oldPsd;
  console.log(oldPsd);
  // 连接数据库
  mongoClient.connect(connect_str,function(err,db){
    if(err){
      res.json({"error":1,"data":"抱歉，数据库连接失败"});
      return;
    }
    var check_data = {
      username:req.session.username,
      password:oldPsd
    }
    db.collection("students").findOne(check_data,function(err,data){
      if(err){
        res.json({error:1,data:"抱歉，查询数据失败"});
        db.close();
        return;
      }
      db.close(); 
      if(!data){
        res.json({error:2,data:"抱歉，密码不正确"});
      }else{
        res.json({error:0,data:"可以改密码了"});
      } 
    })
  })
})
app.listen(3000);