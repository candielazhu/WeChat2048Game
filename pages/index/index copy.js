const GRID_SIZE = 4;
const CELL_SIZE = 80; // rpx

Page({
  data: {
    grid: Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)),
    tiles: [],
    score: 0,
    bestScore: 0,
    gameOver: false,
    startX: 0,
    startY: 0
  },

  onLoad() {
    this.initGame();
    // 从本地存储加载最高分
    const bestScore = wx.getStorageSync('bestScore') || 0;
    this.setData({ bestScore });
  },

  initGame() {
    // 初始化网格
    const grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    
    // 重置游戏状态
    this.setData({
      grid,
      tiles: [],
      score: 0,
      gameOver: false
    });
    
    // 添加初始方块
    this.addRandomTile();
    this.addRandomTile();
  },

  // 在随机空位置添加一个新方块（90%概率为2，10%概率为4）
  addRandomTile() {
    const emptyCells = [];
    const grid = this.data.grid;
    
    // 收集所有空位置
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === 0) {
          emptyCells.push({ x, y });
        }
      }
    }
    
    if (emptyCells.length > 0) {
      // 随机选择一个空位置
      const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const value = Math.random() < 0.9 ? 2 : 4;
      
      // 更新网格数据
      grid[cell.y][cell.x] = value;
      
      // 创建新方块
      const newTile = {
        id: Date.now() + Math.random(), // 唯一ID
        x: cell.x,
        y: cell.y,
        value: value,
        new: true,
        // 添加目标位置，用于动画
        targetX: cell.x,
        targetY: cell.y
      };
      
      // 添加到方块列表
      const tiles = [...this.data.tiles, newTile];
      this.setData({ 
        grid,
        tiles 
      });
      
      // 短暂延迟后移除new标记
      setTimeout(() => {
        const updatedTiles = tiles.map(tile => ({
          ...tile,
          x: tile.targetX,
          y: tile.targetY
        }));
        this.setData({ tiles: updatedTiles });
      }, 200);
    }
  },

  // 处理触摸开始事件
  touchStart(e) {
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY
    });
  },

  // 处理触摸结束事件（判断滑动方向）
  touchEnd(e) {
    if (this.data.gameOver) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - this.data.startX;
    const dy = endY - this.data.startY;
    
    // 判断滑动方向（水平或垂直方向上移动超过30px才视为有效滑动）
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // 水平方向
        dx > 0 ? this.move('right') : this.move('left');
      } else {
        // 垂直方向
        dy > 0 ? this.move('down') : this.move('up');
      }
    }
  },

  // 移动方块（核心算法）
  move(direction) {
    const grid = this.data.grid.map(row => [...row]);
    let tiles = [...this.data.tiles];
    let moved = false;
    let score = this.data.score;
    
    // 根据方向确定遍历顺序
    const xStart = direction === 'right' ? GRID_SIZE - 1 : 0;
    const xEnd = direction === 'right' ? 0 : GRID_SIZE - 1;
    const xStep = direction === 'right' ? -1 : 1;
    
    const yStart = direction === 'down' ? GRID_SIZE - 1 : 0;
    const yEnd = direction === 'down' ? 0 : GRID_SIZE - 1;
    const yStep = direction === 'down' ? -1 : 1;
    
    // 标记需要移除的方块（合并后）
    const tilesToRemove = [];
    
    // 遍历网格
    for (let y = yStart; y !== yEnd + yStep; y += yStep) {
      for (let x = xStart; x !== xEnd + xStep; x += xStep) {
        if (grid[y][x] !== 0) {
          let newX = x;
          let newY = y;
          let currentValue = grid[y][x];
          
          // 根据方向计算移动目标位置
          while (true) {
            let nextX = newX;
            let nextY = newY;
            
            if (direction === 'left') nextX--;
            if (direction === 'right') nextX++;
            if (direction === 'up') nextY--;
            if (direction === 'down') nextY++;
            
            // 检查边界
            if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) break;
            
            // 检查目标位置是否为空
            if (grid[nextY][nextX] === 0) {
              // 移动到空位置
              grid[nextY][nextX] = currentValue;
              grid[newY][newX] = 0;
              newX = nextX;
              newY = nextY;
              moved = true;
            } 
            // 检查是否可以合并
            else if (grid[nextY][nextX] === currentValue) {
              // 合并方块
              grid[nextY][nextX] = currentValue * 2;
              grid[newY][newX] = 0;
              moved = true;
              
              // 更新分数
              score += currentValue * 2;
              
              // 标记合并的方块
              const tileIndex = tiles.findIndex(t => t.x === newX && t.y === newY);
              if (tileIndex !== -1) {
                tiles[tileIndex] = {
                  ...tiles[tileIndex],
                  merged: true,
                  x: nextX,
                  y: nextY,
                  value: currentValue * 2
                };
                tilesToRemove.push(tiles[tileIndex].id);
              }
              
              break;
            } else {
              break;
            }
          }
          
          // 更新方块位置
          const tileIndex = tiles.findIndex(t => t.x === x && t.y === y);
          if (tileIndex !== -1 && !tiles[tileIndex].merged) {
            tiles[tileIndex] = {
              ...tiles[tileIndex],
              targetX: newX,
              targetY: newY
            };
          }
        }
      }
    }
    
    // 移除已合并的方块
    tiles = tiles.filter(tile => !tilesToRemove.includes(tile.id));
    
    // 如果有移动，添加新方块并更新状态
    if (moved) {
      this.setData({
        grid,
        tiles,
        score
      });
      
      // 更新最高分
      if (score > this.data.bestScore) {
        this.setData({ bestScore: score });
        wx.setStorageSync('bestScore', score);
      }
      
      // 添加新方块
      setTimeout(() => {
        this.addRandomTile();
        this.checkGameOver();
      }, 200);
    }
  },

  // 检查游戏是否结束
  checkGameOver() {
    const grid = this.data.grid;
    
    // 检查是否有空位置
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === 0) {
          return false; // 还有空位置，游戏继续
        }
      }
    }
    
    // 检查是否有相邻的相同方块
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const value = grid[y][x];
        // 检查右侧
        if (x < GRID_SIZE - 1 && grid[y][x + 1] === value) return false;
        // 检查下方
        if (y < GRID_SIZE - 1 && grid[y + 1][x] === value) return false;
      }
    }
    
    // 没有可移动的方块，游戏结束
    this.setData({ gameOver: true });
    return true;
  },

  // 重新开始游戏
  restartGame() {
    this.initGame();
  }
});