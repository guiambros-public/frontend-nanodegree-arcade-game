// ---------------------------------------------------
var DEBUG = false;

// --------------------------
//  Enemy Class
// --------------------------
//
// Properties
//   . this.sprite    - relative path to enemy's sprite image
//
// Methods:
//   . handleInput    - controls keyboard inputs
//   . render         - renders player on screen
//   . checkCollision - checks for collision between the enemy and the player object
//   . setRandomSpeed - change enemy's speed to a random number, limited by _MAX_SPEED
//   . setSpeed       - change enemy's speed to a specific number
//   . setLane        - move enemy to a specific lane [1-3]
//
var Enemy = function(row) {

    // enemy properties
    this.sprite = 'images/enemy-bug.png';

    // enemy screen constants
    this._START_X = -100;
    this._START_Y = -20;
    this._END_X = 500;
    this._ROW_HEIGHT = 83;

    // enemy constants
    this._MAX_SPEED = 400;
    this._ENEMY_WIDTH = 96;
    this._ENEMY_HEIGHT = 60;
    this._ENEMY_TOP_PADDING = 79; // transparent padding on top of image
    this._VERTICE_TOLERANCE = 13; // pixel of tolerance, to compensate corners of the bounding box

    // initilize the enemy
    this._x = this._START_X;
    this.setRandomSpeed();
    this.setLane(row);
};


// method Enemy.update()
//
//   Calculates new enemy's position.
//
//   This is called once at every tick (dt) by engine.js, and is independent
//   of processor speed. The function also checks for screen wrapping on the
//   right side, and checks for collision with player object.
//
Enemy.prototype.update = function(dt) {
    this._x += dt * this.speed;

    // check if enemy arrived at the end of screen and 1) wraps to the left,
    // 2) change speed, and 3) 50% chance to change langes randomly
    if (this._x > this._END_X) {
        this._x = this._START_X;
        this.setRandomSpeed();
        if (Math.random()<0.5) {
            this.setLane(rnd(2)+1);
        }
    }

    // check for collision and increment
    if (this.checkCollision()) {
        player.reset();
        player.setScore("score-bugs", player.score_bugs += 1);
    }
};


// Enemy.render()
//
//   Renders enemy object on screen
//
//   This is also called once at every tick (dt) by engine.js, right after
//   updating enemy's position through update(). The function simply draws
//   the enemy sprite on position x,y.
//
//   If DEBUG variable is set to true, it'll also draw a bounding box around
//   the enemy, so you can see and debug collision more easily.
//
Enemy.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this._x, this._y);

    if (DEBUG) {    // draw the bounding box
        ctx.beginPath();
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeRect(
            this._x,
            this._y + this._ENEMY_TOP_PADDING,
            this._ENEMY_WIDTH,
            this._ENEMY_HEIGHT);
    }
};

// Enemy.setLane(row)
//
//   Moves the enemy to a new lane specified by [row]. Used when enemies are
//   respawing, so they show up on a different lane every time.
//
Enemy.prototype.setLane = function(row) {
    this._y = this._START_Y + (row * this._ROW_HEIGHT);
};


// Enemy.setRandomSpeed(row)
//
//   Changes enemy's speed to a random number. The max speed is controlled by
//   constant _MAX_SPEED.
//
Enemy.prototype.setRandomSpeed = function() {
    this.speed = (Math.random() * this._MAX_SPEED) + (0.1 * this._MAX_SPEED);
};


// Enemy.setSpeed(row)
//   Changes enemy's speed to a specific value specificed by [speed].
//
Enemy.prototype.setSpeed = function(speed) {
    this.speed = speed;
};


// Enemy.checkCollision()
//
//   Checks for collision between the enemy and the player object. This is
//   achieved by executing 3 checks: //
//      1) vertical collision, when player's centroid is between ymin/ymax
//      2) horizontal collision, when player's centroid is between xmin/xmax
//      3) collision with one of the corners, when distance from centroid to
//         one of the 4 vertices of the bounding box is < player's radius
//
//    The Enemy shape has rounded corners, so it was used a correction
//    factor determined by the constant [_VERTICE_TOLERANCE]. This way a
//    collision is not prematurely flagged.
//
Enemy.prototype.checkCollision = function() {
    var vc = [player.centroid_x, player.centroid_y]; // player centroid

    // coordinates of bounding box, clockwise
    var v1 = [this._x,                      this._y + this._ENEMY_TOP_PADDING];
    var v2 = [this._x + this._ENEMY_WIDTH,  this._y + this._ENEMY_TOP_PADDING];
    var v3 = [this._x + this._ENEMY_WIDTH,  this._y + this._ENEMY_TOP_PADDING + this._ENEMY_HEIGHT];
    var v4 = [this._x,                      this._y + this._ENEMY_TOP_PADDING + this._ENEMY_HEIGHT];

    // vertical collision
    if (vc[0] >= v1[0] && vc[0] <= v2[0]) {
        var dist = Math.min ( Math.abs(vc[1]-v1[1]),   // top collision
                              Math.abs(vc[1]-v3[1]));  // bottom collision
        if (dist <= player._RADIUS) {
            debug("detected collision vertical");
            return true;
        }
    }
    // horizontal collision
    if (vc[1] >= v2[1] && vc[1] <= v3[1]) {
        var dist = Math.min ( Math.abs(vc[0]-v1[0]),   // left collision
                              Math.abs(vc[0]-v3[0]));  // right collision
        if (dist <= player._RADIUS) {
            debug("detected collision horizontal");
            return true;
        }
    }
    // collision with any of the 4 vertices
    dist = Math.min( dist_xy(vc, v1), dist_xy(vc, v2),
                     dist_xy(vc, v3), dist_xy(vc, v4) );
    if ((dist + this._VERTICE_TOLERANCE) <= player._RADIUS) {
        debug("detected collision vertices");
        return true;
    }
};



//
// ----------------------------------
//  Player Class
// ----------------------------------
//
// Properties:
//   . centroid    - center x,y of the sprite. Used to detect collisions
//   . pos_col/row - player position in the 5x6 map grid
//   . score_bugs  - number of times the player died
//   . score       - number of times player achieved the goal
//   . sprite      - relative path to current avatar's sprite image
//   . avatar_list - array with all possible avatars
//
// Methods:
//   . handleInput  - controls keyboard inputs
//   . render       - renders player on screen
//   . moveTo       - move player to a new position on the 5x6 grid
//   . changeAvatar - changes to the next available avatar
//   . reset        - resets the player to initial position
//   . setScore     - increments score on the page
//
var Player = function() {

    // player properties
    this.avatar_list = ['images/char-boy.png',
                        'images/char-cat-girl.png',
                        'images/char-horn-girl.png',
                        'images/char-pink-girl.png',
                        'images/char-princess-girl.png'];
    this.sprite = this.avatar_list[0];
    this.pos_col = 2;       // col 0-4
    this.pos_row = 5;       // row 0-5
    this.centroid_x = 0;
    this.centroid_y = 0;
    this.score_bugs = 0;
    this.score = 0;

    // player constants
    this._COL_WIDTH = 101;
    this._ROW_HEIGHT = 83;
    this._RADIUS = 35;

    // load resources and set initial position
    Resources.load(this.avatar_list);
    this.moveTo(this.pos_col, this.pos_row);
};


Player.prototype.update = function(dt) {
    // not used
};


// Player.render()
//
//   Renders player object on screen
//
//   This is called once at every tick (dt) by engine.js. The function
//   simply draws the player sprite on position x,y.
//
//   If DEBUG variable is set to true, it'll also draw a bounding circle
//   around the player, so you can see and debug collision more easily.
//
Player.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this._x, this._y);
    if (DEBUG) {   // draw the bounding ellipse, if running in debug mode
        ctx.arc( this.centroid_x, this.centroid_y, this._RADIUS, 0, Math.PI * 2, true );
        ctx.strokeStyle = "red";
        ctx.stroke();
    }
};


// Player.handleInput()
//
//   Handles keyboard input. Each corresponding arrow key moves the
//   player in the corresponding direction. Space changes to the next
//   available player avatar.
//
Player.prototype.handleInput = function(keycode) {
    debug("handling input [" + keycode + "]");

    if ( typeof keycode == 'undefined' ) return;
    else if (keycode=="up"    && this.pos_row>0) { this.pos_row -= 1; }
    else if (keycode=="down"  && this.pos_row<5) { this.pos_row += 1; }
    else if (keycode=="right" && this.pos_col<4) { this.pos_col += 1; }
    else if (keycode=="left"  && this.pos_col>0) { this.pos_col -= 1; }
    else if (keycode=="space") { this.changeAvatar(); }
    this.moveTo(this.pos_col, this.pos_row);
};

//
// Player.moveTo()
//
//   Moves the player to a specific position in the 5x6 grid.
//
//   The x,y coordinates are calculated using the sprite's width/height.
//   Player's centroid is also recalculated, which is used to check
//   for collision with enemies.
//
//   If player reaches to row 0 (meaning: the top-most row), the score
//   is incremented and the player is transported back to its starting
//   position.
//
Player.prototype.moveTo = function(col, row) {
    this.pos_col = col;
    this.pos_row = row;
    this._x = 0 + (col * this._COL_WIDTH);
    this._y = -10 + (row * this._ROW_HEIGHT);
    this.centroid_x = this._x + Resources.get(this.sprite).width/2;
    this.centroid_y = this._y + Resources.get(this.sprite).height/2 + 15;
    if (row==0) {
        this.setScore("score-human", this.score += 1);
        this.reset();
    }
};


//
// Player.changeAvatar()
//
//   Iterates over the list of available avatars
//
Player.prototype.changeAvatar = function() {
    l = this.avatar_list.length;
    idx = this.avatar_list.indexOf(this.sprite);
    this.sprite = this.avatar_list[(idx+1)%l];
};


//
// Player.reset()
//
//   Resets player to its starting position on the grid (2, 5)
//
Player.prototype.reset = function() {
    this.moveTo(2, 5);
};


//
// Player.setScore()
//
//   Adjust score in the HTML element
//
Player.prototype.setScore = function(elem_id, score) {
    var e = document.getElementById(elem_id);
    e.innerHTML = score;
};


//-----------------------------------
// Initialize all objects
//

// 4 enemies, one in each lane, plus one randomly placed
var allEnemies = [];
allEnemies.push(new Enemy(1));
allEnemies.push(new Enemy(2));
allEnemies.push(new Enemy(3));
allEnemies.push(new Enemy(1 + Math.floor(Math.random()*3)));

// create player
var player = new Player();



//
// ------------------------------------
// Auxiliary functions
// ------------------------------------
//
// listen for key presses
document.addEventListener('keyup', function(e) {
    var allowedKeys = {
        32: 'space',
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down'
    };

    player.handleInput(allowedKeys[e.keyCode]);
});

// returns a random number between 0 and max (inclusive)
function rnd(max) {
    return Math.floor(Math.random()*(max+1));
}

// toggles pause/resume
function pause_resume(){
    debug("pause/unpause");
    paused = !paused;
}

// calculates distance between two points (x,y)
function dist_xy(p1, p2) {
    return Math.sqrt( Math.pow(p1[0]-p2[0], 2) + Math.pow(p1[1]-p2[1], 2));
}

// support for debug
function debug(msg) {
    if (DEBUG) {
        console.log(msg);
    }
}
