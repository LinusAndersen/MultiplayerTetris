let express = require("express");
let app = express();
let server = app.listen(3000, () => { console.log("Server online") });
let playerHealth = 5;
app.use(express.static("public"));
let io = require("socket.io")(server);
let players = [];
let inGame = false;
let blocks = [];
let tetrisBlocks = [[[0,0],[0,1],[1,1],[1,0]],[[0,0],[0,1],[0,2],[0,-1]],[[0,0],[0,-1],[-1,0],[1,0]],[[0,0],[0,1],[1,0],[2,0]],[[0,0],[1,0],[0,-1],[-1,-1]],[[0,0],[0,1],[1,0]]];
let tickSpeed = 0;
blocks.push.apply(blocks, tetrisBlocks);

let field = [];
let score = 0;
field[0] = [14];
field[1] = [25];
for (let i = 0; i < field[0] * field[1]; i++){
  field.push([0,"blue"]);
}
let nBlock = blocks[Math.floor(Math.random() * blocks.length)];
console.log(nBlock);
console.log(xMirror(nBlock));

io.sockets.on("connection", function(socket) {
    //name == "undefined"
    io.sockets.connected[socket.id].emit('yourID', socket.id);
    players.push(new Player(socket.id, "-", "-"));
    console.log(players);
    console.log("A new Client connected: " + socket.id);
    socket.on('UpdateNC',
       function(data) { //data is keyName
         HelperClass.getPlayer(socket.id).name = data.name;
         HelperClass.getPlayer(socket.id).color = data.color;
         console.log(HelperClass.getPlayer(socket.id));
       });


    socket.on('Ready',
        function(data) {
          HelperClass.getPlayer(socket.id).ready = true;
          console.log("The player " + HelperClass.getPlayer(socket.id).name + " is now ready.");
          console.log(getReadyPlayer() + " of " + players.length + " Player are ready.");
          io.sockets.emit('UpdateReady', {ready: getReadyPlayer(), players: players.length});
          if (getReadyPlayer() == players.length && inGame == false){
            io.sockets.emit('StartGame', null);
            inGame = true;
            tickSpeed = 1000;
            tick();
          }

        });

    socket.on('KeyPressed',
       function(data) { //data is keyName
        if (data[1] == "a"){
          HelperClass.getPlayer(data[0]).move(-1,0,field);
        }
        if (data[1] == "d"){
          HelperClass.getPlayer(data[0]).move(1,0,field);
        }
        if (data[1] == "j"){
          HelperClass.getPlayer(data[0]).rotateRight(field);
        }
        if (data[1] == "l"){
          HelperClass.getPlayer(data[0]).rotateLeft(field);
        }
        if (data[1] == "s"){
          if (HelperClass.getPlayer(data[0]).isShape){
            HelperClass.getPlayer(data[0]).move(0,1,field);
          }
        }
        scoring();
        redrawPlayers();
        sendData();

       });

    socket.on('disconnect', function() {
        if (HelperClass.IsTherePlayer(socket.id)) {
            console.log("The player " + HelperClass.getPlayer(socket.id).name + " left the game.");
            players.splice(players.indexOf(HelperClass.getPlayer(socket.id)), 1);
        }
        console.log("A Client disconnected: " + socket.id);
      });
});


function getReadyPlayer(){
  let ready = 0;
  for (player of players){
    if (player.ready == true){
      ready ++;
    }
  }
  return ready;
}
function clearField(){
  for (let i = 0; i < field.length; i++){
    if (field[i][0] == 0){
      field[i][1] = "blue";
    }
  }
}
function scoring(){
  for (let y = 0; y < field[1]; y++){
    let not = false;
    for (let x = 0; x < field[0]; x++){
        if (field[2 + x + y*field[0]][0] == 0){
          not = true;
        }
    }

    if (not == false){
      tickSpeed = tickSpeed * 0.9;
      score ++;
      io.sockets.emit('updateScore', score);
      for (let y1 = y; y1 >= 0; y1--){
        for (let x1 = 0; x1 < field[0]; x1++){
          if (y1 == 0){
            field[2 + x1] = [0,"blue"];
          }
          else{
            field[2 + x1 + y1*field[0]] = field[2 + x1 + (y1 - 1)*field[0]];
          }
        }
      }
    }
}
}
function findRH(block){
  let r = 0
  for (brick of block){
    if (brick[1] < r){
      r = brick[1];
    }
  }
  return r;
}
function tick(){
  for (player of players){
    if (player.isShape == false){
      for (let k = 0; k < 5; k++){
        let nBlock = blocks[Math.floor(Math.random() * blocks.length)];
        if (Math.random() > 0.5){
          nBlock = xMirror(nBlock);
        }
        if (isInList(nBlock) == false){
          player.sPos = {x: Math.floor(field[0]/2), y: -findRH(nBlock)};
          player.newShape(nBlock);
        }
      }
    }
    else{
      player.move(0,1,field);
    }
  }
  scoring();
  redrawPlayers();
  sendData();
  setTimeout(tick, tickSpeed);
}
function xMirror(block){
  let newBlock = [];
  for (let i = 0; i < block.length; i ++){
    newBlock.push([block[i][0] * -1, block[i][1]]);
  }
  return newBlock;
}
function isInList(block){
  let In = false;
  for (let i = 0; i < players.length; i ++){
    if (players[i].cShape == block){
      In = true;
    }
  }
  return In;

}
function redrawPlayers(){
  clearField();
  for (let player of players){
    player.cPosToField(field);
  }
}
function sendData() {
  //data
  io.sockets.emit('FUpdate', field);
}

//x,y is in evry part relative f.e. 0.5,0.5 is in the middle of the screen
class Player {
  constructor(id, name, color) {
      this.id = id;
      this.name = name;
      this.color = color;
      this.ready = false;
      this.cShape = [];
      this.isShape = false;
      this.sPos = {x: 0, y: 0};
  }
  rotateRight(field){ //left
    for (let i = 0; i < this.cShape.length; i++){
      //swap x and y
      let p = this.cShape[i][0];
      this.cShape[i][0] = this.cShape[i][1];
      this.cShape[i][1] = p;
      //negate y
      this.cShape[i][1] = this.cShape[i][1] * -1;
    }
    if (this.canBe(field, this.sPos.x, this.sPos.y) == false){
      this.rotateLeft(field);
    }
  }
  rotateLeft(field){
    for (let i = 0; i < this.cShape.length; i++){
      //swap x and y
      let p = this.cShape[i][0];
      this.cShape[i][0] = this.cShape[i][1];
      this.cShape[i][1] = p;
      //negate x
      this.cShape[i][0] = this.cShape[i][0] * -1;
    }
    if (this.canBe(field, this.sPos.x, this.sPos.y) == false){
      this.rotateRight(field);
    }
  }
  newShape(nShape){
    this.isShape = true;
    this.cShape = nShape;
  }
  canBe(field,x,y){
    let cannot = false;
    for (let i = 0; i < this.cShape.length; i++){
      if (2 + (this.cShape[i][0] + x) + (this.cShape[i][1] + y) * field[0] < field.length && (this.cShape[i][0] + x) >= 0 && (this.cShape[i][0] + x) < field[0] && this.cShape[i][1] + y >= 0){
        if (field[2 + (this.cShape[i][0] + x) + (this.cShape[i][1] + y) * field[0]][0] == 1){ //check if pos ist bei field 1, dann besetzt
            cannot = true;
        }
      }
      else{
        cannot = true;
      }
    }
    if (cannot){
      return false;
    }
    else{
      return true;
    }
  }

  move(xdir,ydir, field){
    this.sPos.x += xdir;
    this.sPos.y += ydir;
    if (this.canBe(field, this.sPos.x, this.sPos.y) == false){
      this.sPos.x -= xdir;
      this.sPos.y -= ydir;
      if (ydir == 1){
        for (let i = 0; i < this.cShape.length; i++){
          field[2 + (this.cShape[i][0] + this.sPos.x) + (this.cShape[i][1] + this.sPos.y) * field[0]][0] = 1;
        }
          this.cShape = [];
        this.isShape = false;
      }
    }
  }
  cPosToField(field){
    for (let i = 0; i < this.cShape.length; i++){
      field[2 + (this.cShape[i][0] + this.sPos.x) + (this.cShape[i][1] + this.sPos.y) * field[0]][1] = this.color;
    }
  }
}
class HelperClass {
    static collisionCircle(pos1, pos2, addedupSize) {
        let x = pos2.x - pos1.x;
        let y = pos2.y - pos1.y;
        return (Math.sqrt(x * x + y * y) < addedupSize);
    }
    static getDir(pos1, pos2) {
        let x = pos2.x - pos1.x;
        let y = pos2.y - pos1.y;
        return (Math.atan2(y, x));
    }
    static getPlayer(id) {
        for (let player of players) {
            if (player.id === id) {
                return player;
            }
        }
    }
    static IsTherePlayer(id) {
        for (let player of players) {
            if (player.id === id) {
                return true;
            }
        }
        return false;
    }
    static sgetPlayer(id){
      if (IsTherePlayer(id)){
      for (let player of players) {
          if (player.id === id) {
              return player;
          }
      }
    }
    else{
      return def;
    }
  }
}
