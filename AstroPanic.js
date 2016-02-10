/**
 * Initialize the Game and starts it.
 */
var game = new Game();

var number = 3;

function init() {
	if(game.init()){
		game.start();
	}
}

/**
 * Define an object to hold all the images for the game so images
 * are only ever created once.
 */
var imageRepository = new function() {
	// Define images
	this.background = new Image();
	this.tank = new Image();
	this.missile = new Image();
	this.enemy = new Image();
	
	// will only start game if all images are loaded
	var numImg = 4;
	var numLoaded = 0;
	function imgLoaded() {
		numLoaded++;
		if (numLoaded == numImg) {
			window.init();
		}
	}
	this.background.onload = function() {
		imgLoaded();
	}
	this.tank.onload = function() {
		imgLoaded();
	}
	this.missile.onload = function() {
		imgLoaded();
	}
	this.enemy.onload = function() {
		imgLoaded();
	}

	// Set images src
	this.background.src = "background.png";
	this.tank.src = "tank.png";
	this.missile.src = "missle.png";
	this.enemy.src = "enemy.png";
}


/**
 * Creates the Drawable object which will be the base class for
 * all drawable objects in the game.
 */
function Drawable() {	
	this.init = function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	};

	this.speed = 0;
	this.canvasWidth = 0;
	this.canvasHeight = 0;
	this.collidableWith = "";
	this.isColliding = false;
	this.type = "";
	
	this.draw = function() {
	};
	this.move = function() {
	};
	this.isCollidableWith = function(object) {
		return(this.collidableWith === object.type);
	};
}

/**
 * The background is drawn on the "background" canvas.
 */
function Background() {
	this.draw = function() {
		this.context.drawImage(imageRepository.background, this.x, this.y);
	};
}
Background.prototype = new Drawable();

/**
 * The missile of the tank is drawn on the "main" canvas.
 */
function Missile(object) {
	this.alive = false; //is true if missile is currently in use
	var self = object;

	this.spawn = function(x,y,speed){
		this.x = x;
		this.y = y;
		this.speed = speed;
		this.alive = true;
	};

	this.draw = function(){
		this.context.clearRect(this.x,this.y,this.width,this.height);
		this.y -= this.speed;
		if (this.isColliding) {
			return true;
		}
		else if (self === "missile" && this.y <= 0 - this.height) {
			return true;	
		}
		else {
			if (self === "missile") {
				this.context.drawImage(imageRepository.missile,this.x,this.y);
			}
			return false;
		}
	};

	this.clear = function() {
		this.x = 0;
		this.y = 0;
		this.speed = 0;
		this.alive = false;
		this.isColliding = false;
	};
}
Missile.prototype = new Drawable();

/**
 * Used for collision detection. Divides canvas into
 * four quadrants. This way collision is called fewer times.
 */
function QuadTree(boundBox, lvl) {
	var maxObj = 10;
	this.bounds = boundBox || {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	var object = [];
	this.nodes = [];
	var level = lvl || 0;
	var maxLvls = 4;

	this.clear = function(){
		object = [];
		for (var i = 0; i < this.nodes.length; i++) {
			this.nodes[i].clear();
		}
		this.nodes = [];
	};

	// finds all objects on canvas
	this.getAllObjs = function(returnedObjs) {
		for (var i = 0; i < this.nodes.length; i++) {
			this.nodes[i].getAllObjs(returnedObjs);
		}
		for (var i = 0, len = object.length; i < len; i++) {
			returnedObjs.push(object[i]);
		}
		return returnedObjs;
	};

	// finds objects in a quadrant
	this.findObjs = function(returnedObjs, obj) {
		if (typeof obj == "undefined") {
			console.log("UNDEFINED OBJECT");
			return;
		}
		var index = this.getIndex(obj);
		if (index != -1 && this.nodes.length) {
			this.nodes[index].findObjs(returnedObjs, obj);
		}
		for (var i = 0, len = object.length; i < len; i++) {
			returnedObjs.push(object[i]);
		}
		return returnedObjs;
	};

	this.insert = function(obj){
		if (typeof obj === "undefined") {
			return;
		}
		if (obj instanceof Array) {
			for (var i = 0, len = obj.length; i < len; i++) {
				this.insert(obj[i]);
			}
			return;
		}
		if (this.nodes.length) {
			var index = this.getIndex(obj);
			if (index != -1) {
				this.nodes[index].insert(obj);
				return;
			}
		}
		object.push(obj);
		if (object.length > maxObj && level < maxLvls) {
			if (this.nodes[0] == null) {
				this.split();
			}
			var i = 0;
			while (i < object.length) {
				var index = this.getIndex(object[i]);
				if (index != -1) {
					this.nodes[index].insert((object.spliced(i,1))[0]);
				}
				else {
					i++;
				}
			}
		}
	};

	// finds which quad an object is in
	this.getIndex = function(obj) {
		var index = -1;
		var vertMid = this.bounds.x + this.bounds.width / 2;
		var horzMid = this.bounds.y + this.bounds.height / 2;
		var topQuad = (obj.y < horzMid && obj.y + obj.height < horzMid);
		var botQuad = (obj.y > horzMid);
		if (obj.x < vertMid && obj.x + obj.width < vertMid) {
			if (topQuad) {
				index = 1;
			}
			else if (botQuad) {
				index = 2;
			}
		}
		else if (obj.x > vertMid) {
			if (topQuad) {
				index = 0;
			}
			else if (botQuad) {
				index = 3;
			}
		}
		return index;
	};

	// sets the quadrants
	this.split = function() {
		var subWidth = (this.bounds.width / 2) | 0;
		var subHeight = (this.bounds.height / 2) | 0;
		this.nodes[0] = new QuadTree({
			x: this.bounds.x + subWidth,
			y: this.bounds.y,
			width: subWidth,
			height: subHeight
		}, level+1);
		this.nodes[1] = new QuadTree({
			x: this.bounds.x,
			y: this.bounds.y,
			width: subWidth,
			height: subHeight
		}, level+1);
		this.nodes[2] = new QuadTree({
			x: this.bounds.x,
			y: this.bounds.y + subHeight,
			width: subWidth,
			height: subHeight
		}, level+1);
		this.nodes[3] = new QuadTree({
			x: this.bounds.x + subWidth,
			y: this.bounds.y + subHeight,
			width: subWidth,
			height: subHeight
		}, level+1);
	};
}

/**
 * Creates pool for missiles and enemies.
 */
function Pool(max){
	var size = max;
	var pool = [];

	this.getPool = function(){
		var obj = [];
		for (var i = 0; i < size; i++) {
			if (pool[i].alive) {
				obj.push(pool[i]);
			}
		}
		return obj;
	};

	this.init = function(object) {
		// creates missile pool
		if (object == "missile") {
			for (var i = 0; i < size; i++) {
				var missile = new Missile("missile");
				missile.init(0,0,imageRepository.missile.width,imageRepository.missile.height);
				missile.collidableWith = "enemy";
				missile.type = "missile";
				pool[i] = missile;
			}
		}
		// creates enemy pool
		else if (object == "enemy") {
			for (var i = 0; i < size; i++) {
				var enemy = new Enemy();
				enemy.init(0,0,imageRepository.enemy.width,imageRepository.enemy.height);
				pool[i] = enemy;
			}
		}
	};

	this.get = function(x,y,speed){
		if (!pool[size-1].alive) {
			pool[size-1].spawn(x,y,speed);
			pool.unshift(pool.pop());
		}	
	};

	this.animate = function(){
		for (var i = 0; i < size; i++) {
			if (pool[i].alive) {
				if (pool[i].draw()) {
					pool[i].clear();
					pool.push((pool.splice(i,1))[0]);
				}
			}
			else {
				break;
			}
		}
	};
}

/**
 * The tank is drawn on the "tank" canvas. It is
 * controlled by the player. Can only go left and
 * right and can shoot.
 */
function Tank() {
	this.alive = true;
	this.speed = 4;
	this.missilePool = new Pool(30);
	this.missilePool.init("missile");

	var fireRate = 15;
	var counter = 0;
	this.collidableWith = "enemy";
	this.type = "tank";
	
	this.draw = function() {
		this.context.drawImage(imageRepository.tank,this.x,this.y);
	};
	this.move = function() {
		counter++;
		if (KEY_STATUS.left || KEY_STATUS.right) {
			this.context.clearRect(this.x,this.y,this.width,this.height);
			if (KEY_STATUS.left) {
				this.x -= this.speed;
				if (this.x <= 0) {
					this.x = 0;
				}		
			}
			else if (KEY_STATUS.right) {
				this.x += this.speed;
				if (this.x >= this.canvasWidth - this.width) {
					this.x = this.canvasWidth - this.width;
				}
			}		
		}
		if (!this.isColliding) {
			this.draw();
		}
		else {
			this.alive = false;
			game.gameOver();
		}
		if (KEY_STATUS.space && counter >= fireRate && !this.isColliding) {
			this.fire();
			counter = 0;
		}
		// personal twist, "nukes" the games
		if (KEY_STATUS.shift) {
			this.alive = false;
			this.context.clearRect(this.x,this.y,this.width,this.height);
			game.nukeIt();
		}	
	};

	this.fire = function() {
		this.missilePool.get(this.x+52,this.y-20, 3);
	};
}
Tank.prototype = new Drawable();

/**
 * The enemy is drawn on the "main" canvas. Bounces
 * around the canvas and kills the player if hit.
 */
function Enemy() {
	this.alive = false;
	this.collidableWith = "bullet";
	this.type = "enemy";
	
	this.spawn = function(x,y,speed){
		this.x = x;
		this.y = y;
		this.speed = speed;
		this.vx = 2;
		this.vy = speed;
		this.alive = true;
	};
	this.draw = function() {
		this.context.clearRect(this.x,this.y,this.width,this.height);
		// bounces around the canvas
		if (this.x >= 600 - this.width) {
			this.vx = -this.vx;
		}
		if (this.x <= 0) {
			this.vx = -this.vx;
		}
		if (this.y >= 550 - this.height) {
			this.vy = -this.vy;
		}
		if (this.y <= 0) {
			this.vy = -this.vy;
		}
		if (KEY_STATUS.shift) {
			this.alive = false;
			this.context.clearRect(this.x,this.y,this.width,this.height);
		}
		this.x += this.vx;
		this.y += this.vy;
		if (!this.isColliding) {
			this.context.drawImage(imageRepository.enemy,this.x,this.y);
			return false;
		}
		else {
			game.playerScore += 10;
			return true;
		}
	};

	this.clear = function() {
		this.x = 0;
		this.y = 0;
		this.speed = 0;
		this.vx = 0;
		this.vy = 0;
		this.alive = false;
		this.isColliding = false;
	};
}
Enemy.prototype = new Drawable();

/**
 * Creates the Game object which will hold all objects and data for
 * the game.
 */
function Game() {
	// gets canvas information
	this.init = function() {
		this.bgCanvas = document.getElementById('background');
		this.tankCanvas = document.getElementById('tank');
		this.mainCanvas = document.getElementById('main');
		this.nukeCanvas = document.getElementById('nuke');
		
		// Test to see if canvas is supported, if not the game won't run
		if (this.bgCanvas.getContext) {
			this.bgContext = this.bgCanvas.getContext('2d');
			this.tankContext = this.tankCanvas.getContext('2d');
			this.mainContext = this.mainCanvas.getContext('2d');
		
			Background.prototype.context = this.bgContext;
			Background.prototype.canvasWidth = this.bgCanvas.width;
			Background.prototype.canvasHeight = this.bgCanvas.height;

			Tank.prototype.context = this.tankContext;
			Tank.prototype.canvasWidth = this.tankCanvas.width;
			Tank.prototype.canvasHeight = this.tankCanvas.height;

			Missile.prototype.context = this.mainContext;
			Missile.prototype.canvasHeight = this.mainCanvas.height;
			Missile.prototype.canvasWidth = this.mainCanvas.width;

			Enemy.prototype.context = this.mainContext;
			Enemy.prototype.canvasWidth = this.mainCanvas.width;
			Enemy.prototype.canvasHeight = this.mainCanvas.height;
		
			// draw background
			this.background = new Background();
			this.background.init(0,0); // Set draw point to 0,0

			// set tank
			this.tank = new Tank();
			var tankStartX = 250;
			var tankStartY = 474;
			this.tank.init(tankStartX,tankStartY, imageRepository.tank.width,imageRepository.tank.height);
			
			// create enemies
			this.enemyPool = new Pool(30);
			this.enemyPool.init("enemy");
			this.spawnWave(number);

			// create collision detector
			this.quadTree = new QuadTree({x:0,y:0,width:this.mainCanvas.width,height:this.mainCanvas.height});

			// keeps track of player's score
			this.playerScore = 0;
			return true;
		}
		else {
			return false;
		}
	};
	
	/**
	 * This is my own personal twist.
	 * If "shift" is pressed, a "nuke" is dropped. 
	 */
	this.nukeIt = function(){
		document.getElementById('game-over').style.display = "block";
		this.bgContext.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
		this.tankContext.clearRect(0, 0, this.tankCanvas.width, this.tankCanvas.height);
		this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
		document.getElementById('nuke').src = "nuke.png";
	};
	
	// creates a wave of enemies
	this.spawnWave = function(number){
		var height = imageRepository.enemy.height;
		var xArray = new Array();
		var yArray = new Array();
		for (var i = 0; i < number; i++) {
			xArray[i] = Math.floor((Math.random() * 500) + 1);
			yArray[i] = height + (Math.floor((Math.random()*20)+1));
		}
		for (var i = 0; i < number; i++) {
			this.enemyPool.get(xArray[i],yArray[i],3);
		}
	};	
	
	// Start the animation loop
	this.start = function() {
		this.tank.draw();
		animate();
	};

	// restarts the game
	// clears everything then creates new game
	this.restart = function(){
		document.getElementById('game-over').style.display = "none";
		this.bgContext.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
		this.tankContext.clearRect(0, 0, this.tankCanvas.width, this.tankCanvas.height);
		this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

		this.quadTree.clear();
		this.background.init(0,0);
		this.tank.init(this.tankStartX, this.tankStartY,
		               imageRepository.tank.width, imageRepository.tank.height);

		this.enemyPool.init("enemy");
		number = 3;
		this.spawnWave(number);

		this.playerScore = 0;

		if(game.init()){
			game.start();
		}
	};

	// draws game over title
	this.gameOver = function() {
		document.getElementById('game-over').style.display = "block";
	}
}


/**
 * The animation loop. 
 * Calls the requestAnimationFrame
 */
function animate() {
	document.getElementById('score').innerHTML = game.playerScore;
	game.quadTree.clear();
	game.quadTree.insert(game.tank);
	game.quadTree.insert(game.tank.missilePool.getPool());
	game.quadTree.insert(game.enemyPool.getPool());

	detectCollision();

	if (game.enemyPool.getPool().length === 0) {
		number++;
		game.spawnWave(number);
	}

	// if player is still alive, allow game play
	if (game.tank.alive) {
		requestAnimFrame( animate );
		game.background.draw();
		game.tank.move();
		game.tank.missilePool.animate();
		game.enemyPool.animate();
	}
}

/**
 * Detects collisions between all game objects.
 */
function detectCollision() {
	var object = [];
	game.quadTree.getAllObjs(object);
	for (var x = 0, len = object.length; x < len; x++) {
		game.quadTree.findObjs(obj = [], object[x]);
		for (y = 0, length = obj.length; y < length; y++) {
			if (object[x].collidableWith === obj[y].type &&
				(object[x].x < obj[y].x + obj[y].width &&
			     object[x].x + object[x].width > obj[y].x &&
				 object[x].y < obj[y].y + obj[y].height &&
				 object[x].y + object[x].height > obj[y].y)) {
				object[x].isColliding = true;
				obj[y].isColliding = true;
			}
		}
	}
}

KEY_CODES = {
	16: 'shift',
	32: 'space',
	37: 'left',
	39: 'right',
}

KEY_STATUS = {};
for (code in KEY_CODES) {
	KEY_STATUS[KEY_CODES[code]] = false;
}

document.onkeydown = function(e) {
	var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
	if (KEY_CODES[keyCode]) {
		e.preventDefault();
		KEY_STATUS[KEY_CODES[keyCode]] = true;
	}
}

document.onkeyup = function(e) {
	var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
	if (KEY_CODES[keyCode]) {
		e.preventDefault();
		KEY_STATUS[KEY_CODES[keyCode]] = false;
	}
}

/**	
 * requestAnim shim layer by Paul Irish
 * Finds the first API that works to optimize the animation loop, 
 * otherwise defaults to setTimeout().
 * Saw this in a tutorial and thought it would help.
 */
window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       || 
			window.webkitRequestAnimationFrame || 
			window.mozRequestAnimationFrame    || 
			window.oRequestAnimationFrame      || 
			window.msRequestAnimationFrame     || 
			function(/* function */ callback, /* DOMElement */ element){
				window.setTimeout(callback, 1000 / 60);
			};
})();