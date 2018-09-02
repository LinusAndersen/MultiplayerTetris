let socket, menu = {},
    game = {},
    inGame = false;
    inLevelEditor = false;
let cw = 500,
    ch = 500; //default
let id = "";
let field0 = 0, field1 = 0;
window.onload = () => {
    //socket = io("192.168.2.112:3000");
    socket = io("192.168.2.110:3000");
    cw = innerWidth;
    ch = innerHeight; //set to innerHeight
    setupMenu();
    socket.on("UpdateReady", data => {
      document.getElementById("readyLabel").innerHTML = "Ready: " + data.ready + "/" + data.players;
    });
    socket.on("StartGame", data => {
      setupGame();
    });
    socket.on("FUpdate", data => { //data consists of objects (image, pos)
        if (inGame){
            console.log("ASD");
            console.log(data[0]);
            console.log(data[1]);
            if (field0 == 0 && data[0] * data[1] + 2 == data.length){
                field0 = data[0];
            }
            if (field1 == 0 && data[0] * data[1] + 2 == data.length){
                field1 == data[1];
            }
            if (data[0] * data[1] + 2 == data.length){
                drawField(data, game.ctx);
            }
            else{
                data[0] = field0;
                data[1] = field1;}
        }
    });
    socket.on("updateScore", data => { //data consists of objects (image, pos)
        document.getElementById("scoreLabel").innerHTML = "Score: " + data;
    });
    socket.on("yourID", data => { //data consists of objects (image, pos)
        id = data;
    });

}
document.addEventListener('keydown', (event) => {
  //const keyName = event.key;
  if (inGame){
    socket.emit('KeyPressed',[id,event.key]);
  }
});

function clearChildren(elt = document.body) {
    for (let child = elt.children.length - 1; child >= 0; child--) {
        elt.removeChild(elt.children[child]);
    }
}
function ce(name, props = {}, elt = document.body) {
    newElt = elt.appendChild(document.createElement(name));
    mergeDeep(newElt, props);
    return newElt;
}
function mergeDeep(target, ...sources) {

    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, {
                    [key]: {}
                });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, {
                    [key]: source[key]
                });
            }
        }
    }

    return mergeDeep(target, ...sources);
}
function cspan(text, elt = document.body) {
    ce("span", { innerText: text }, elt);
}
function sendNC(){
  socket.emit("UpdateNC", {name: menu.name.value, color: getColor() });
}
function handleStartGame() {
    inGame = true;
    socket.emit("Ready", null);
}
function handleLevelEditor() {
  inLevelEditor = true;
}
function redirect(src){
  window.location = src;
}
function setupGame() {
    document.body.style.textAlign = "";
    clearChildren();
    game.canvas = ce("canvas", { width: cw, height: ch });
    game.ctx = game.canvas.getContext("2d");
    document.body.style.textAlign = "center";
    menu.score = ce("h3", { innerText: "Score: 0", align: "center",x: "500", y: "100", id: "scoreLabel" });
}
function drawField(field,ctx){ //field data is erst x und y breite in string und dann colors
    console.log(field);
    game.ctx.clearRect(0, 0, cw, ch);
    let xs = field[0];
    let ys = field[1]; //start is 0,0
    let a = findLower(cw/xs,ch/ys);//a is kanten länge eines quadrats
    //console.log(a);
    let pa = 0;
    for (let y = 0; y < ys; y++){
        for (let x = 0; x < xs; x++){
            drawRect(x * a, y*a, a, a, field[2 + x + y*xs][1],ctx);
            pa += 1;
        }
    }
    console.log(pa);
}
function findLower(a,b){
    if (a < b){
        return a;
    }
    else{
        return b;
    }
}
function colorChange() {
    menu.colorDiv.style.backgroundColor = getColor();
    sendNC();
}
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}
function getColor() {
    let vals = [
        menu.colorRSlider.value,
        menu.colorGSlider.value,
        menu.colorBSlider.value,
    ]
    return "rgb(" + vals[0].toString() + "," + vals[1].toString() + "," + vals[2].toString() + ")"
}
function show_image(src, x,y, width, height, alt) {
    var img = document.createElement("img");
    img.src = src;
    img.width = width;
    img.height = height;
    img.alt = alt;
    document.body.appendChild(img);
}
function setupMenu() {
    clearChildren();
    document.body.style.textAlign = "center";
    menu.header = ce("h1", { innerText: "CoOp-Tetris", align: "center" });
    menu.nameLabel = ce("h3", { innerText: "Name:", align: "center" });
    menu.name = ce("input", { type: "text", onchange: sendNC});
    menu.colorLabel = ce("h4", { innerText: "Color:", align: "center" });
    menu.colorDiv = ce("div", { style: { border: "1px solid" }, margin: "auto" });
    cspan(" R: ", menu.colorDiv);
    menu.colorRSlider = ce("input", { type: "number", min: 0, max: 255, step: 1, value: 255, onchange: colorChange }, menu.colorDiv);
    cspan(" G: ", menu.colorDiv);
    menu.colorGSlider = ce("input", { type: "number", min: 0, max: 255, step: 1, value: 255, onchange: colorChange }, menu.colorDiv);
    cspan(" B: ", menu.colorDiv);
    menu.colorBSlider = ce("input", { type: "number", min: 0, max: 255, step: 1, value: 255, onchange: colorChange }, menu.colorDiv);
    ce("br");
    menu.start = ce("button", { onclick: handleStartGame, innerText: "Ready", margin: "auto" });
    //menu.openLevelEditor = ce("button", { onclick: handleLevelEditor, innerText: "Open Leveleditor", margin: "auto" });
    menu.readyLabel = ce("h3", { innerText: "Nobody is ready yet.", align: "center", id: "readyLabel" });
}



function drawRect(x,y,x2,y2,color,ctx){
    ctx.fillStyle=color;
    ctx.fillRect(x,y,x2,y2);
}
