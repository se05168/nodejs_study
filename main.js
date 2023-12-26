var http = require('http'); //나는 'http'라는 모듈을 사용하겠
var fs = require('fs');
var url = require('url');
var qs = require('querystring');

function basicContent(title, filelist, matchTitle){
  var list = '<ul>';
  var i = 0;
  while(i<filelist.length){
    list = list+'<li><a href="/?id='+filelist[i]+'">'+matchTitle[filelist[i]]+'</a></li>';
    i=i+1;
  }
  list = list+'</ul>';
  return `<!DOCTYPE html>
  <html lang="en" dir="ltr">
    <head>
      <meta charset="utf-8">
      <title>${matchTitle[title]}</title>
    </head>
    <body>
      <h1><a href="/">제목목</a></h1>
      ${list}
      <a href="/create">글쓰기</a>
      `;
}

function content(title, songtitle, videourl, description){
  return `<a href="/update?id=${title}">수정</a>
          <form action="/delete_process" method="post">
            <input type="hidden" name="id" value="${title}">
            <input type="submit" value="삭제">
          </form>
          <h2>${songtitle}</h2>
          <p>
            <iframe width="560" height="315" src="https://www.youtube.com/embed/${videourl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </p>
          <p>
            ${description}
          </p>
    </body>
  </html>`;
}

var app = http.createServer(function(request,response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query; //http://localhost:3000/?id=HTML
    // console.log(_url); // /?id=HTML
    // console.log(queryData); //[Object: null prototype] { id: 'HTML' }
    // console.log(queryData.id); //HTML
    var pathname = url.parse(_url, true).pathname;
    var title = queryData.id;

    fs.readFile('./data/titlefile', 'utf8', function(err, map){
      var matchTitle = {};
      var element = map.toString().split("\n");
      var temp = '';
      var i = 0;
      while(i<element.length){
        temp = element[i].split(':');
        matchTitle[temp[0]] = temp[1];
        i+=1;
      }
      fs.readdir('./data/content', function(err, filelist){
        if (pathname === '/'){// /?id=뫄뫄 이거는 여기 안 걸림 뒤에 없어서. /fdas?어쩌구 이거는 걸림
          if (title === undefined){ //홈
            title = 'Welcome';
            var basic = basicContent(title, filelist, matchTitle);
            var template = `${basic}
            </body></html>`;
            response.writeHead(200);
            response.end(template);
          }
          else { //목록글들
            fs.readFile(`./data/content/${title}`, 'utf8', function(err, data){
              var array = data.toString().split("\n");
              var videourl = array[0];
              description = '';
              var j = 1;
              while(j<array.length){
                description += array[j];
                description += '<br>';
                j+=1;
              }
              var basic = basicContent(title, filelist, matchTitle);
              var songtitle = matchTitle[title];
              var template = `${basic}${content(title, songtitle, videourl, description)}`;
              response.writeHead(200);
              response.end(template);
            });
          }
        }
        else if(pathname === '/create'){ //글쓰기
          title = 'create';
          var basic = basicContent(title, filelist, matchTitle);
          var template = `${basic}
          <form action="/create_process" method="post">
              <p><input type="text" name="title" placeholder="파일명(띄쓰x)"></p>
              <p><input type="text" name="songtitle" placeholder="가수 - 노래 제목"></p>
              <p><input type="text" name="video" placeholder="유튜브 url"></p>
              <p>
                <textarea name="description" placeholder="내용"></textarea>
              </p>
              <p>
                <input type="submit" value="등록">
              </p>
            </form>
          </body></html>`;
          response.writeHead(200);
          response.end(template);
        }
        else if(pathname === '/create_process'){ //글쓰기 처리 페이지
          var body = '';
          request.on('data', function(data){ //여기의 'data'나 밑의 'end'는 on의 event이며, 위의 'utf8'과 같이 라이브러리에 속한 개념이지 data라는 string을 파라미터로 넘기는 것이 아님
          // 전송된 data의 크기를 조각조각 잘라서 보냄. 따라서 이런 on data 걸 통해서 data 받아들임
            body = body + data;
          });
          request.on('end', function(){
            var post = qs.parse(body); //post에 'create_process'에서 받은 post 정보가 들어있을 것임
            var title = post.title;
            var fileContent = `${post.video}
${post.description}`;
            var titleObject = `
${post.title}:${post.songtitle}`;
            fs.appendFile('./data/titlefile', titleObject, 'utf8', function(err){});
            fs.writeFile(`./data/content/${title}`, fileContent,'utf8', function(err){
              response.writeHead(302, {Location: `/?id=${title}`}); //리디렉션
              response.end();
            })
          });
        }
        else if(pathname === '/update'){ //수정
          fs.readFile(`./data/content/${title}`, 'utf8', function(err, data){
            var array = data.toString().split("\n");
            var videourl = array[0];
            description = '';
            var j = 1;
            while(j<array.length){
              description += array[j];
              description += '<br>';
              j+=1;
            }
            var basic = basicContent(title, filelist, matchTitle);
            var songtitle = matchTitle[title];
            var template = `${basic}
            <form action="/update_process" method="post">
                <input type="hidden" name="id" value="${title}">
                <p><input type="text" name="title" placeholder="파일명(띄쓰x)" value="${title}"></p>
                <p><input type="text" name="songtitle" placeholder="가수 - 노래 제목" value="${songtitle}"></p>
                <p><input type="text" name="video" placeholder="유튜브 url" value="${videourl}"></p>
                <p>
                  <textarea name="description" placeholder="내용">${description}</textarea>
                </p>
                <p>
                  <input type="submit" value="등록">
                </p>
              </form>
            </body></html>`;
            response.writeHead(200);
            response.end(template);
          });
        }
        else if(pathname === '/update_process'){ //수정 처리 페이지
          var body = '';
          request.on('data', function(data){
          // 전송된 data의 크기를 조각조각 잘라서 보냄. 따라서 이런 on data 걸 통해서 data 받아들임
            body = body + data;
          });
          request.on('end', function(){
            var post = qs.parse(body); //post에 'create_process'에서 받은 post 정보가 들어있을 것임
            var id = post.id;
            var title = post.title;
            var fileContent = `${post.video}
${post.description}`;
            delete matchTitle[id];
            var titleObject = `${post.title}:${post.songtitle}`;
            var titlefilecontent = '';
            for (const [key, value] of Object.entries(matchTitle)){
              titlefilecontent+=`${key}:${value}
`;
            }
            titlefilecontent+=titleObject;
            fs.writeFile(`./data/titlefile`, titlefilecontent, 'utf8', function(err){});
            fs.rename(`./data/content/${id}`, `./data/content/${title}`, function(err){
              fs.writeFile(`./data/content/${title}`, fileContent,'utf8', function(err){
                response.writeHead(302, {Location: `/?id=${title}`}); //리디렉션
                response.end();
              })
            })
          });
        }
        else if(pathname === '/delete_process'){ //삭제 처리 페이지
          var body = '';
          request.on('data', function(data){
            body = body + data;
          });
          request.on('end', function(){
            var post = qs.parse(body);
            var id = post.id;
            fs.unlink(`./data/content/${id}`, function(err){
              delete matchTitle[id];
              var titleObject = `${post.title}:${post.songtitle}`;
              var titlefilecontent = '';
              var i = 0;
              var count = Object.keys(matchTitle).length;
              for (const [key, value] of Object.entries(matchTitle)){
                if(i<count-1){
                  titlefilecontent+=`${key}:${value}
`;}
                else{titlefilecontent+=`${key}:${value}`;}
                i+=1;
              }
              fs.writeFile(`./data/titlefile`, titlefilecontent, 'utf8', function(err){});
              response.writeHead(302, {Location: `/`}); //리디렉션
              response.end();
            });
          });
        }
        else { //에러
          response.writeHead(404);
          response.end('Not Found');
        }
      });
    });

    //response.end(queryData.id); //queryData를 통해 querystring에서 뽑아온 id를 웹페이지에 출력함(웹에 html 소스를 보냄)

});
app.listen(3000);
