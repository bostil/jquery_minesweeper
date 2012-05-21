// generates a cell at the given coordinates
function Cell(x, y) {
    var self = this;
    this.x = x;
    this.y = y;
    this.$div = $('<div/>');
    
    this.flagged = false;
    this.hasMine = false;
    this.visible = false;
    this.minedNeighbors = 0;
    
    // draws a cell
    this.draw = function() {
        self.$div.data('x', self.x)
        .data('y', self.y)
        .addClass('cell')
        .addClass('default');        
        return self.$div;
    }
    
    // returns the cell's HTML element
    this.getElement = function() {
        return self.$div;
    }
    
    // display the cell's contents
    this.show = function() {
        if (self.visible) {
            return;
        }
        
        var $el = self.getElement();
        
        self.visible = true;
        $el.removeClass('default').addClass('visible');
        if (self.hasMine) {
            $el.addClass('has-mine');
        } else if (self.minedNeighbors > 0) {
            $el.addClass('mined-neighbors');
            $el.text(self.minedNeighbors);
        }
    }
}

var GameStates = {
    NOT_STARTED: "not-started",
    RUNNING: "running",
    WON: "won",
    LOST: "lost"
};

// contains the state of all cells on the game board
function Board() {
    var self = this;
    var maxColumns = 10;
    var maxRows = 10;
    var maxMines = 10;
    
    this.columns = maxColumns;
    this.rows = maxRows;
    this.mines = maxMines;
    this.cells = [];
    this.gameState = GameStates.NOT_STARTED;
    
    // starts a new row
    this.drawRowDivider = function() {
        var $div = $('<div/>');
        
        $div.addClass('clearfix');
        return $div;
    }
    
    // sets up the initial game state
    this.initialize = function() {
        var $board = $('#board');
        
        for (var y = 0; y < self.rows; y++) {
            for (var x = 0; x < self.columns; x++) {                
                if (self.cells[x] === undefined) {
                    self.cells[x] = [];
                }
                self.cells[x][y] = new Cell(x, y);
                $board.append(self.cells[x][y].draw());
            }
            $board.append(self.drawRowDivider());
        }
        self.bindEvents();
        self.generateMines(self.mines);
        self.gameState = GameStates.RUNNING;
    }
    
    this.bindEvents = function() {
        var $cell = $('.cell');
        
        // left click
        $cell.on('click', self.leftClick);
        
        // right click
        $cell.on('contextmenu', self.rightClick);
        
        // check win condition
        $('body').on('game-state-check', self.checkWinCondition);
    }
    
    this.leftClick = function(event) {
        var $clickedCell = $(this);
        var cell = self.cells[$clickedCell.data('x')][$clickedCell.data('y')];
        console.log('(' + cell.x + ', ' + cell.y + ') clicked', cell);
            
        // do not reveal flagged or already visible cells
        if(!(cell.flagged || cell.visible)) {
            if(cell.hasMine) {
                self.gameState = GameStates.LOST;
                self.showAll();
                $("#messages").text('You Lose!');
            } else {
                // show cell contents
                self.checkNeighbors(cell);
                $('body').trigger('game-state-check');
                console.log('triggered game state check')
            }
        }
    }
    
    this.rightClick = function(event) {
        event.preventDefault();
        event.stopPropagation();
        var $clickedCell = $(this);
        var cell = self.cells[$clickedCell.data('x')][$clickedCell.data('y')];
        console.log('(' + cell.x + ', ' + cell.y + ') right clicked', cell);

        if(cell.flagged) {
            cell.flagged = false;
            cell.getElement().removeClass('flagged').addClass('default');
        } else if (!cell.visible) {
            // don't flag a visible cell
            cell.flagged = true;
            cell.getElement().removeClass('default').addClass('flagged');
        }
    }
    
    // count hidden cells
    this.countHiddenCells = function() {
        var count = 0;
        
        for (var y = 0; y < self.rows; y++) {
            for (var x = 0; x < self.columns; x++) {
                if (!self.cells[x][y].visible) {
                    count++;
                }
            }
        }
        return count;
    }
    
    // check whether the player has won yet
    this.checkWinCondition = function(event) {
        var hiddenCells = self.countHiddenCells();
        
        console.log('checking win condition...');
        
        if (hiddenCells === self.mines) {
            self.gameState = GameStates.WON;
            $("#messages").text('You Win!');
        }
    }
    
    this.getRandomCell = function() {
        var x = Math.floor(Math.random() * self.columns);
        var y = Math.floor(Math.random() * self.rows);
        return self.cells[x][y];
    }
    
    // places mines on the board
    this.generateMines = function(mines) {                
        while (mines > 0) {
            var cell = self.getRandomCell();
            
            // check if it has a mine
            // if not, place one, then decrement
            if(!cell.hasMine) {
                cell.hasMine = true;
                mines -= 1;
                console.log('(' + cell.x + ', ' + cell.y + ') mine placed', cell);
            }
        }
    }
    
    // gets all neighbors of a given cell
    this.getNeighbors = function(cell) {
        var neighbors = [];
        
        for (var i = cell.x - 1; i <= cell.x + 1; i++) {
            for (var j = cell.y - 1; j <= cell.y + 1; j++) {
                //console.log('(' + i + ', ' + j + ') raw loop');
                // ignore out of bounds coordinates
                if ((i >= 0) && (j >= 0) && (i < self.columns) && (j < self.rows)) {
                    neighbors.push(self.cells[i][j]);
                    //console.log('(' + i + ', ' + j + ') added to neighbors', cell);
                }
            }
        }
        return neighbors;
    }
    
    // looks at neighboring cells to see how many have mines, then reveals cell
    this.checkNeighbors = function(cell) {
        var minesFound = 0;
        var neighbors = self.getNeighbors(cell);
        var i;
        
        // only looks if the cell is not already visible
        if (!cell.visible) {
            for (i = 0; i < neighbors.length; i++) {
                if (neighbors[i].hasMine) {
                    minesFound++;
                }
            }
            
            // update the cell information
            cell.minedNeighbors = minesFound;
            cell.show();
            
            // if there are no mines nearby, send left click trigger to neighbors
            if (minesFound === 0) {
                for (i = 0; i < neighbors.length; i++) {
                    neighbors[i].getElement().trigger('click');
                }
            }
        }
    }
    
    // shows entire board
    this.showAll = function() {
        var cell;
        
        for (var y = 0; y < self.rows; y++) {
            for (var x = 0; x < self.columns; x++) {
                cell = self.cells[x][y];
                self.checkNeighbors(cell);
            }
        }
    }
}

$(document).ready(function() {
    var board = new Board();
    board.initialize();
});
