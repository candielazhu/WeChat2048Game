Page({
  data: {
    score: 0,
    bestScore: 0,
    board: [],
    gameOver: false,
    size: 4,
    animationClasses: Array(4).fill().map(() => Array(4).fill('')),
    isEmergency: false // 新增：紧急状态标识
  },

  onLoad() {
    this.initGame()
    this.loadBestScore()
  },

  // 初始化游戏
  initGame() {
    const board = Array(this.data.size).fill().map(() => Array(this.data.size).fill(0))
    this.setData({
      board: board,
      score: 0,
      gameOver: false,
      isEmergency: false // 重置紧急状态
    })
    this.addRandomTile()
    this.addRandomTile()
    this.checkEmergencyStatus() // 检查紧急状态
  },

  // 添加随机方块
  addRandomTile() {
    const emptyCells = []
    const board = this.data.board
    
    for (let i = 0; i < this.data.size; i++) {
      for (let j = 0; j < this.data.size; j++) {
        if (board[i][j] === 0) {
          emptyCells.push({ row: i, col: j })
        }
      }
    }

    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
      board[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 2 : 4
      this.setData({ board: board })
    }
  },

  // 新增：检查紧急状态（空格是否只剩3个或更少）
  checkEmergencyStatus() {
    const board = this.data.board
    let emptyCount = 0
    
    for (let i = 0; i < this.data.size; i++) {
      for (let j = 0; j < this.data.size; j++) {
        if (board[i][j] === 0) {
          emptyCount++
        }
      }
    }
    
    const isEmergency = emptyCount <= 3 && emptyCount > 0
    this.setData({ isEmergency: isEmergency })
  },

  // 移动方块
  move(direction) {
    if (this.data.gameOver) return

    let moved = false
    const newBoard = this.data.board.map(row => [...row])
    let newScore = this.data.score

    switch (direction) {
      case 'left':
        moved = this.moveLeft(newBoard)
        break
      case 'right':
        moved = this.moveRight(newBoard)
        break
      case 'up':
        moved = this.moveUp(newBoard)
        break
      case 'down':
        moved = this.moveDown(newBoard)
        break
    }

    if (moved) {
      this.setData({
        board: newBoard,
        score: this.data.score
      })
      this.addRandomTile()
      this.checkEmergencyStatus() // 移动后检查紧急状态
      
      if (this.isGameOver()) {
        this.setData({ gameOver: true })
        this.saveBestScore()
        wx.showModal({
          title: '游戏结束',
          content: `得分: ${this.data.score}\n最高分: ${this.data.bestScore}`,
          showCancel: false,
          confirmText: '再来一局',
          success: (res) => {
            if (res.confirm) {
              this.restart()
            }
          }
        })
      }
    }
  },

  // 向左移动
  moveLeft(board) {
    let moved = false;
    // 用于记录每个方块的动画类
    const newAnimationClasses = this.data.animationClasses.map(row => [...row]);

    for (let row = 0; row < this.data.size; row++) {
      const line = board[row].filter(val => val !== 0)

      for (let i = 0; i < line.length - 1; i++) {
        if (line[i] === line[i + 1]) {
          line[i] *= 2
          this.data.score += line[i]
          line[i + 1] = 0
          
        // 合并时添加合并动画
        newAnimationClasses[row][i] = 'merge-effect';
        }
      }
      const newLine = line.filter(val => val !== 0)
      while (newLine.length < this.data.size) {
        newLine.push(0)
      }
      
      for (let col = 0; col < this.data.size; col++) {
        if (board[row][col] !== newLine[col]) {
          moved = true
          
        // 左滑时，非0方块添加左滑动画
        if (newLine[col] !== 0) {
          newAnimationClasses[row][col] = 'slide-left';
        }
        }
        board[row][col] = newLine[col]
      }
    }
  
    // 移动完成后，更新动画类数据
    if (moved) {
      this.setData({
        animationClasses: newAnimationClasses
      });
      
      // 延迟清除动画类，确保动画播放完成
      setTimeout(() => {
        this.setData({
          animationClasses: Array(this.data.size).fill().map(() => Array(this.data.size).fill(''))
        });
      }, 250);
    }

    return moved
  },

  // 向右移动
  moveRight(board) {
    let moved = false;

    const newAnimationClasses = this.data.animationClasses.map(row => [...row]);

    for (let row = 0; row < this.data.size; row++) {
      const line = board[row].filter(val => val !== 0)
      for (let i = line.length - 1; i > 0; i--) {
        if (line[i] === line[i - 1]) {
          line[i] *= 2
          this.data.score += line[i]
          line[i - 1] = 0

          newAnimationClasses[row][i] = 'merge-effect';

        }
      }
      const newLine = line.filter(val => val !== 0)
      while (newLine.length < this.data.size) {
        newLine.unshift(0)
      }
      
      for (let col = 0; col < this.data.size; col++) {
        if (board[row][col] !== newLine[col]) {
          moved = true

          if (newLine[col] !== 0) {
            newAnimationClasses[row][col] = 'slide-right';
          }
        }
        board[row][col] = newLine[col]
      }
    }
    // 移动完成后，更新动画类数据
    if (moved) {
      this.setData({
        animationClasses: newAnimationClasses
      });
      
      // 延迟清除动画类，确保动画播放完成
      setTimeout(() => {
        this.setData({
          animationClasses: Array(this.data.size).fill().map(() => Array(this.data.size).fill(''))
        });
      }, 250);
    }
    return moved
  },

  // 向上移动
moveUp(board) {
  let moved = false;
  const newAnimationClasses = this.data.animationClasses.map(row => [...row]);
  
  // 按列处理
  for (let col = 0; col < this.data.size; col++) {
    // 提取当前列的数据
    const column = [];
    for (let row = 0; row < this.data.size; row++) {
      column.push(board[row][col]);
    }
    
    // 过滤非零元素
    const nonZero = column.filter(val => val !== 0);
    
    // 合并相同数字的方块（从上到下）
    for (let i = 0; i < nonZero.length - 1; i++) {
      if (nonZero[i] === nonZero[i + 1]) {
        nonZero[i] *= 2;
        this.data.score += nonZero[i];
        nonZero[i + 1] = 0;
        
        // 合并时添加动画
        newAnimationClasses[i][col] = 'merge-effect';
      }
    }
    
    // 过滤合并后的零元素，并补齐长度
    const newColumn = nonZero.filter(val => val !== 0);
    while (newColumn.length < this.data.size) {
      newColumn.push(0);
    }
    
    // 更新列数据
    for (let row = 0; row < this.data.size; row++) {
      if (board[row][col] !== newColumn[row]) {
        moved = true;
        
        // 上滑时，非0方块添加动画
        if (newColumn[row] !== 0) {
          newAnimationClasses[row][col] = 'slide-up';
        }
      }
      board[row][col] = newColumn[row];
    }
  }
  
  // 更新动画类并延迟清除
  if (moved) {
    this.setData({ animationClasses: newAnimationClasses });
    setTimeout(() => {
      this.setData({
        animationClasses: Array(this.data.size).fill().map(() => Array(this.data.size).fill(''))
      });
    }, 250);
  }
  
  return moved;
},

// 向下移动
moveDown(board) {
  let moved = false;
  const newAnimationClasses = this.data.animationClasses.map(row => [...row]);
  
  // 按列处理
  for (let col = 0; col < this.data.size; col++) {
    // 提取当前列的数据
    const column = [];
    for (let row = 0; row < this.data.size; row++) {
      column.push(board[row][col]);
    }
    
    // 过滤非零元素
    const nonZero = column.filter(val => val !== 0);
    
    // 合并相同数字的方块（从下到上）
    for (let i = nonZero.length - 1; i > 0; i--) {
      if (nonZero[i] === nonZero[i - 1]) {
        nonZero[i] *= 2;
        this.data.score += nonZero[i];
        nonZero[i - 1] = 0;
        
        // 合并时添加动画
        newAnimationClasses[i][col] = 'merge-effect';
      }
    }
    
    // 过滤合并后的零元素，并补齐长度（注意：从底部开始填充）
    const newColumn = nonZero.filter(val => val !== 0);
    while (newColumn.length < this.data.size) {
      newColumn.unshift(0); // 从上往下填充0
    }
    
    // 更新列数据
    for (let row = 0; row < this.data.size; row++) {
      if (board[row][col] !== newColumn[row]) {
        moved = true;
        
        // 下滑时，非0方块添加动画
        if (newColumn[row] !== 0) {
          newAnimationClasses[row][col] = 'slide-down';
        }
      }
      board[row][col] = newColumn[row];
    }
  }
  
  // 更新动画类并延迟清除
  if (moved) {
    this.setData({ animationClasses: newAnimationClasses });
    setTimeout(() => {
      this.setData({
        animationClasses: Array(this.data.size).fill().map(() => Array(this.data.size).fill(''))
      });
    }, 250);
  }
  
  return moved;
},

  // 检查游戏是否结束
  isGameOver() {
    const board = this.data.board
    // 检查是否有空格
    for (let i = 0; i < this.data.size; i++) {
      for (let j = 0; j < this.data.size; j++) {
        if (board[i][j] === 0) {
          return false
        }
      }
    }

    // 检查是否可以合并
    for (let i = 0; i < this.data.size; i++) {
      for (let j = 0; j < this.data.size; j++) {
        const current = board[i][j]
        if ((j < this.data.size - 1 && current === board[i][j + 1]) ||
            (i < this.data.size - 1 && current === board[i + 1][j])) {
          return false
        }
      }
    }

    return true
  },

  // 触摸事件处理
  onTouchStart(e) {
    this.startX = e.touches[0].clientX
    this.startY = e.touches[0].clientY
  },

  onTouchEnd(e) {
    if (!this.startX || !this.startY) return

    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY

    const diffX = this.startX - endX
    const diffY = this.startY - endY

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 30) {
        this.move('left')
      } else if (diffX < -30) {
        this.move('right')
      }
    } else {
      if (diffY > 30) {
        this.move('up')
      } else if (diffY < -30) {
        this.move('down')
      }
    }

    this.startX = null
    this.startY = null
  },

  // 重新开始游戏
  restart() {
    this.initGame()
  },

  // 加载最高分
  loadBestScore() {
    const bestScore = wx.getStorageSync('2048-best') || 0
    this.setData({ bestScore: bestScore })
  },

  // 保存最高分
  saveBestScore() {
    if (this.data.score > this.data.bestScore) {
      this.setData({ bestScore: this.data.score })
      wx.setStorageSync('2048-best', this.data.score)
    }
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: `我在2048游戏中得了${this.data.score}分！`,
      path: '/pages/game/game'
    }
  }
})