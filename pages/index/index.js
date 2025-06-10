Page({
  data: {
    grid: [], // 4x4网格背景
    tiles: [], // 游戏方块数据
    score: 0, // 当前分数
    bestScore: 0, // 最高分数
    gameOver: false, // 游戏结束状态
    tileId: 0, // 方块唯一ID计数器
    touchStartX: 0, // 触摸开始X坐标
    touchStartY: 0, // 触摸开始Y坐标
    touchEndX: 0, // 触摸结束X坐标
    touchEndY: 0 // 触摸结束Y坐标
  },

  onLoad() {
    this.initGame();
    this.loadBestScore();
  },

  // 初始化游戏
  initGame() {
    // 创建4x4空网格
    const grid = [];
    for (let i = 0; i < 4; i++) {
      grid[i] = [];
      for (let j = 0; j < 4; j++) {
        grid[i][j] = 0;
      }
    }

    this.setData({
      grid: grid,
      tiles: [],
      score: 0,
      gameOver: false,
      tileId: 0
    });

    // 添加两个初始方块
    this.addRandomTile();
    this.addRandomTile();
  },

  // 添加随机方块
  addRandomTile() {
    const emptyCells = this.getEmptyCells();
    if (emptyCells.length === 0) return false;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4; // 90%概率生成2，10%概率生成4
    
    const newTile = {
      id: this.data.tileId++,
      value: value,
      x: randomCell.x,
      y: randomCell.y,
      targetX: randomCell.x,
      targetY: randomCell.y,
      merged: false,
      new: true
    };

    const tiles = [...this.data.tiles, newTile];
    this.setData({
      tiles: tiles,
      tileId: this.data.tileId
    });

    // 移除new动画标记
    setTimeout(() => {
      const updatedTiles = this.data.tiles.map(tile => ({
        ...tile,
        new: false
      }));
      this.setData({ tiles: updatedTiles });
    }, 200);

    return true;
  },

  // 获取空白格子
  getEmptyCells() {
    const emptyCells = [];
    const occupiedCells = new Set();
    
    // 标记已占用的格子
    this.data.tiles.forEach(tile => {
      occupiedCells.add(`${tile.x}-${tile.y}`);
    });

    // 找出空白格子
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        if (!occupiedCells.has(`${x}-${y}`)) {
          emptyCells.push({ x, y });
        }
      }
    }

    return emptyCells;
  },

  // 触摸开始
  touchStart(e) {
    this.setData({
      touchStartX: e.touches[0].clientX,
      touchStartY: e.touches[0].clientY
    });
  },

  // 触摸移动（可选，用于阻止页面滚动）
  touchMove(e) {
    // 阻止页面滚动
    return false;
  },

  // 触摸结束
  touchEnd(e) {
    if (this.data.gameOver) return;

    this.setData({
      touchEndX: e.changedTouches[0].clientX,
      touchEndY: e.changedTouches[0].clientY
    });

    const deltaX = this.data.touchEndX - this.data.touchStartX;
    const deltaY = this.data.touchEndY - this.data.touchStartY;
    
    // 判断滑动方向（最小滑动距离30px）
    if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) {
      return; // 滑动距离太小，忽略
    }

    let direction;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平滑动
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      // 垂直滑动
      direction = deltaY > 0 ? 'down' : 'up';
    }

    this.move(direction);
  },

  // 移动方块
  move(direction) {
    const moved = this.moveTiles(direction);
    if (moved) {
      // 移除merged标记
      setTimeout(() => {
        const tiles = this.data.tiles.map(tile => ({
          ...tile,
          merged: false
        }));
        this.setData({ tiles });
      }, 200);

      // 添加新方块
      setTimeout(() => {
        const added = this.addRandomTile();
        if (added) {
          this.checkGameOver();
        }
      }, 150);
    }
  },

  // 移动方块逻辑
  moveTiles(direction) {
    let moved = false;
    let newTiles = [];
    let scoreAdd = 0;

    // 创建4x4的网格来跟踪方块位置和值
    const grid = Array(4).fill().map(() => Array(4).fill(null));
    this.data.tiles.forEach(tile => {
      grid[tile.y][tile.x] = tile;
    });

    // 根据方向进行移动和合并
    for (let i = 0; i < 4; i++) {
      let line = this.getLine(grid, i, direction);
      let originalLine = JSON.parse(JSON.stringify(line));
      let movedLine = this.moveLine(line);
      
      if (JSON.stringify(originalLine) !== JSON.stringify(movedLine.line)) {
        moved = true;
        scoreAdd += movedLine.score;
      }
      
      this.setLine(grid, i, direction, movedLine.line);
    }

    if (moved) {
      // 重新构建tiles数组，确保每个方块都有正确的位置
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          if (grid[y][x]) {
            const tile = grid[y][x];
            // 更新方块位置
            tile.targetX = x;
            tile.targetY = y;
            // 保持原有的x,y用于动画起始位置
            if (tile.x !== x || tile.y !== y) {
              // 位置发生了变化，更新目标位置
              tile.x = x;
              tile.y = y;
            }
            newTiles.push(tile);
          }
        }
      }

      this.setData({
        tiles: newTiles,
        score: this.data.score + scoreAdd
      });

      // 更新最高分
      if (this.data.score + scoreAdd > this.data.bestScore) {
        this.setData({
          bestScore: this.data.score + scoreAdd
        });
        this.saveBestScore();
      }
    }

    return moved;
  },

  // 获取一行/列的数据
  getLine(grid, index, direction) {
    let line = [];
    if (direction === 'left' || direction === 'right') {
      line = grid[index].slice();
      if (direction === 'right') {
        line = line.reverse();
      }
    } else {
      for (let i = 0; i < 4; i++) {
        line.push(grid[i][index]);
      }
      if (direction === 'down') {
        line = line.reverse();
      }
    }
    return line;
  },

  // 设置一行/列的数据
  setLine(grid, index, direction, line) {
    if (direction === 'right') {
      line = line.reverse();
    } else if (direction === 'down') {
      line = line.reverse();
    }

    if (direction === 'left' || direction === 'right') {
      grid[index] = line;
    } else {
      for (let i = 0; i < 4; i++) {
        grid[i][index] = line[i];
      }
    }
  },

  // 移动一行的逻辑
  moveLine(line) {
    // 过滤掉空位置，只保留有方块的位置
    let filteredLine = line.filter(tile => tile !== null);
    let newLine = [];
    let score = 0;
    let i = 0;

    while (i < filteredLine.length) {
      let currentTile = filteredLine[i];
      
      // 检查是否可以与下一个方块合并
      if (i + 1 < filteredLine.length && 
          filteredLine[i + 1] && 
          currentTile.value === filteredLine[i + 1].value &&
          !currentTile.merged && !filteredLine[i + 1].merged) {
        
        // 合并方块 - 保留第一个方块，删除第二个
        currentTile.value *= 2;
        currentTile.merged = true;
        score += currentTile.value;
        newLine.push(currentTile);
        
        // 跳过被合并的方块
        i += 2;
      } else {
        // 不能合并，直接添加到新行
        newLine.push(currentTile);
        i++;
      }
    }

    // 填充剩余位置为null
    while (newLine.length < 4) {
      newLine.push(null);
    }

    return { line: newLine, score: score };
  },

  // 检查游戏是否结束
  checkGameOver() {
    // 检查是否还有空格
    if (this.getEmptyCells().length > 0) {
      return;
    }

    // 检查是否还能合并
    const grid = Array(4).fill().map(() => Array(4).fill(0));
    this.data.tiles.forEach(tile => {
      grid[tile.y][tile.x] = tile.value;
    });

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const current = grid[y][x];
        // 检查右边
        if (x < 3 && current === grid[y][x + 1]) {
          return;
        }
        // 检查下面
        if (y < 3 && current === grid[y + 1][x]) {
          return;
        }
      }
    }

    // 游戏结束
    this.setData({
      gameOver: true
    });
  },

  // 重新开始游戏
  restartGame() {
    this.initGame();
  },

  // 保存最高分到本地存储
  saveBestScore() {
    wx.setStorageSync('bestScore', this.data.bestScore);
  },

  // 加载最高分
  loadBestScore() {
    try {
      const bestScore = wx.getStorageSync('bestScore') || 0;
      this.setData({
        bestScore: bestScore
      });
    } catch (e) {
      console.log('加载最高分失败:', e);
    }
  }
});