Page({
  data: {
    score: 0,
    bestScore: 0,
    board: [],
    gameOver: false,
    size: 4,
    animationClasses: Array(4).fill().map(() => Array(4).fill('')),
    isEmergency: false,
    characterSkill: null,
    skillIcon: '',
    skillText: '',
    characterName: '',
    skillState: {},
    selectingBlock: false,
    selectedBlock: {
      row: -1,
      col: -1
    },
    globalDoubleAvailable: false
  },

  onLoad(options) {
    this.initGame()
    this.loadBestScore()

    // 初始化角色技能
    if (options.character) {
      const characterId = parseInt(options.character);
      const characters = [{
          id: 1,
          skill: 'timeRewind',
          icon: '⏳',
          text: '时光回溯'
        },
        {
          id: 2,
          skill: 'squareEliminate',
          icon: '🗑️',
          text: '方块消除'
        },
        {
          id: 3,
          skill: 'blockDouble',
          icon: '×2',
          text: '数值倍增'
        }
      ];

      const character = characters.find(c => c.id === characterId);
      if (character) {
        this.setData({
          characterSkill: character.skill,
          skillIcon: character.icon,
          skillText: character.text,
          characterName: options.name || '特殊角色'
        });

        this.initSkillState();
      }
    }
  },

  // 初始化技能状态
  initSkillState() {
    const skillState = {
      timeRewind: {
        history: [],
        count: 3
      },
      squareEliminate: {
        count: 0
      },
      blockDouble: {
        normalCount: 0,
        globalCount: 0
      }
    };

    this.setData({
      skillState,
      selectingBlock: false,
      selectedBlock: {
        row: -1,
        col: -1
      },
      globalDoubleAvailable: false
    });
  },

  // 使用技能
  useSkill() {
    if (this.data.gameOver) return;

    switch (this.data.characterSkill) {
      case 'timeRewind':
        this.timeRewindSkill();
        break;
      case 'squareEliminate':
        this.squareEliminateSkill();
        break;
      case 'blockDouble':
        this.showDoubleOptions();
        break;
    }
  },

  // 显示翻倍选项菜单
  showDoubleOptions() {
    const state = this.data.skillState.blockDouble;
    const options = [];

    if (state.normalCount > 0) {
      options.push('指定方块翻倍');
    }

    if (state.globalCount > 0) {
      options.push('全局最低值翻倍');
    }

    if (options.length === 0) {
      wx.showToast({
        title: '无可用翻倍机会',
        icon: 'none'
      });
      return;
    }

    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const selected = options[res.tapIndex];
        if (selected === '指定方块翻倍') {
          this.activateBlockSelection();
        } else if (selected === '全局最低值翻倍') {
          this.useGlobalDouble();
        }
      }
    });
  },

  // 使用全局翻倍
  useGlobalDouble() {
    const state = this.data.skillState.blockDouble;
    if (state.globalCount <= 0) {
      wx.showToast({
        title: '全局翻倍次数不足',
        icon: 'none'
      });
      return;
    }

    this.globalBlockDouble();
    this.setData({
      'skillState.blockDouble.globalCount': state.globalCount - 1
    });
  },

  // 激活方块选择模式
  activateBlockSelection() {
    const state = this.data.skillState.blockDouble;
    if (state.normalCount <= 0) {
      wx.showToast({
        title: '倍增次数不足',
        icon: 'none'
      });
      return;
    }

    this.setData({
      selectingBlock: true
    });

    wx.showToast({
      title: '请选择一个方块进行翻倍',
      icon: 'none',
      duration: 2000
    });
  },

  // 选择方块进行翻倍
  doubleSelectedBlock() {
    if (!this.data.selectingBlock) return;

    const {
      row,
      col
    } = this.data.selectedBlock;
    if (row === -1 || col === -1) {
      wx.showToast({
        title: '请先选择一个方块',
        icon: 'none'
      });
      return;
    }

    const board = this.data.board.map(row => [...row]);
    if (board[row][col] === 0) {
      wx.showToast({
        title: '不能翻倍空方块',
        icon: 'none'
      });
      return;
    }

    const originalValue = board[row][col];
    board[row][col] *= 2;

    this.setData({
      board: board,
      'skillState.blockDouble.normalCount': this.data.skillState.blockDouble.normalCount - 1,
      selectingBlock: false,
      selectedBlock: {
        row: -1,
        col: -1
      }
    });

    wx.showToast({
      title: `${originalValue} → ${board[row][col]} 翻倍成功!`,
      icon: 'success'
    });
  },

  // 选择方块
  selectBlock(e) {
    if (!this.data.selectingBlock) return;

    const {
      row,
      col
    } = e.currentTarget.dataset;
    this.setData({
      selectedBlock: {
        row,
        col
      }
    });
  },

  // 时光回溯技能 - 修复后的版本
  timeRewindSkill() {
    const state = this.data.skillState.timeRewind;
    if (state.history.length === 0 || state.count <= 0) {
      wx.showToast({
        title: '无可用回溯',
        icon: 'none'
      });
      return;
    }

    // 恢复历史状态
    const history = state.history.pop();
    this.setData({
      board: history.board,
      score: history.score,
      gameOver: false,
      'skillState.timeRewind.count': state.count - 1
    });

    wx.showToast({
      title: '时光回溯成功',
      icon: 'success'
    });

    // 延迟检查游戏状态，确保状态更新完成
    setTimeout(() => {
      this.checkEmergencyStatus();
      if (this.isGameOver()) {
        this.handleGameOver();
      }
    }, 100);
  },

  // 方块消除技能
  squareEliminateSkill() {
    const state = this.data.skillState.squareEliminate;
    if (state.count <= 0) {
      wx.showToast({
        title: '消除次数不足',
        icon: 'none'
      });
      return;
    }

    const board = this.data.board.map(row => [...row]);
    let scoreGain = 0;

    // 消除中间4个方块
    const mid = Math.floor(this.data.size / 2);
    for (let i = mid - 1; i <= mid; i++) {
      for (let j = mid - 1; j <= mid; j++) {
        if (board[i][j] > 0) {
          scoreGain += board[i][j];
          board[i][j] = 0;
        }
      }
    }

    this.setData({
      board: board,
      score: this.data.score + scoreGain,
      'skillState.squareEliminate.count': state.count - 1
    });

    this.addRandomTile();
    this.checkEmergencyStatus();
    
    wx.showToast({
      title: `消除获得 ${scoreGain}分`,
      icon: 'success'
    });
  },

  // 初始化游戏
  initGame() {
    const board = Array(this.data.size).fill().map(() => Array(this.data.size).fill(0))
    this.setData({
      board: board,
      score: 0,
      gameOver: false,
      isEmergency: false,
      animationClasses: Array(this.data.size).fill().map(() => Array(this.data.size).fill('')),
      selectingBlock: false,
      selectedBlock: {
        row: -1,
        col: -1
      }
    })
    
    this.initSkillState();
    this.addRandomTile()
    this.addRandomTile()
    this.checkEmergencyStatus()
  },

  // 添加随机方块
  addRandomTile() {
    const emptyCells = []
    const board = this.data.board

    for (let i = 0; i < this.data.size; i++) {
      for (let j = 0; j < this.data.size; j++) {
        if (board[i][j] === 0) {
          emptyCells.push({
            row: i,
            col: j
          })
        }
      }
    }

    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
      board[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 2 : 4
      this.setData({
        board: board
      })
    }
  },

  // 检查紧急状态
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
    this.setData({
      isEmergency: isEmergency
    })
  },

  // 修复后的移动方法
  move(direction) {
    if (this.data.gameOver || this.data.selectingBlock) return

    const oldScore = this.data.score
    const oldBoard = this.data.board.map(row => [...row])
    const newBoard = this.data.board.map(row => [...row])
    const newAnimationClasses = this.data.animationClasses.map(row => [...row])

    // 保存当前状态用于回溯
    if (this.data.characterSkill === 'timeRewind') {
      const state = this.data.skillState.timeRewind
      state.history.push({
        board: JSON.parse(JSON.stringify(oldBoard)),
        score: oldScore
      })

      // 限制历史记录数量（最多5步）
      if (state.history.length > 5) state.history.shift()
    }

    let moved = false;
    let scoreAdded = 0;

    switch (direction) {
      case 'left':
        ({moved, scoreAdded} = this.moveLeft(newBoard, newAnimationClasses));
        break
      case 'right':
        ({moved, scoreAdded} = this.moveRight(newBoard, newAnimationClasses));
        break
      case 'up':
        ({moved, scoreAdded} = this.moveUp(newBoard, newAnimationClasses));
        break
      case 'down':
        ({moved, scoreAdded} = this.moveDown(newBoard, newAnimationClasses));
        break
    }

    if (moved) {
      const newScore = oldScore + scoreAdded;

      this.setData({
        board: newBoard,
        score: newScore,
        animationClasses: newAnimationClasses
      })

      // 清除动画并添加新方块
      setTimeout(() => {
        this.setData({
          animationClasses: Array(this.data.size).fill().map(() => Array(this.data.size).fill(''))
        });
        
        this.addRandomTile()
        this.checkEmergencyStatus()
        this.updateSkillCounts(oldScore, newScore)

        // 延迟检查游戏是否结束
        setTimeout(() => {
          if (this.isGameOver()) {
            this.handleGameOver();
          }
        }, 100);
      }, 250);
    }
  },

  // 新增：统一的技能次数更新方法
  updateSkillCounts(oldScore, newScore) {
    const scoreIncrease = newScore - oldScore;
    
    if (scoreIncrease > 0) {
      if (this.data.characterSkill === 'timeRewind') {
        const gain = Math.floor(newScore / 2000) - Math.floor(oldScore / 2000)
        if (gain > 0) {
          this.setData({
            'skillState.timeRewind.count': this.data.skillState.timeRewind.count + gain
          })
          wx.showToast({
            title: `获得${gain}次回溯机会`,
            icon: 'none'
          })
        }
      } else if (this.data.characterSkill === 'squareEliminate') {
        const gain = Math.floor(newScore / 1500) - Math.floor(oldScore / 1500)
        if (gain > 0) {
          this.setData({
            'skillState.squareEliminate.count': this.data.skillState.squareEliminate.count + gain
          })
          wx.showToast({
            title: `获得${gain}次消除机会`,
            icon: 'none'
          })
        }
      } else if (this.data.characterSkill === 'blockDouble') {
        const normalGain = Math.floor(newScore / 1000) - Math.floor(oldScore / 1000)
        if (normalGain > 0) {
          this.setData({
            'skillState.blockDouble.normalCount': this.data.skillState.blockDouble.normalCount + normalGain
          })
          wx.showToast({
            title: `获得${normalGain}次翻倍机会`,
            icon: 'none'
          })
        }

        const globalGain = Math.floor(newScore / 3000) - Math.floor(oldScore / 3000)
        if (globalGain > 0) {
          this.setData({
            'skillState.blockDouble.globalCount': this.data.skillState.blockDouble.globalCount + globalGain,
            globalDoubleAvailable: true
          })
          wx.showToast({
            title: `获得${globalGain}次全局翻倍机会`,
            icon: 'none'
          })
        }
      }
    }
  },

  // 新增：统一的游戏结束处理方法
  handleGameOver() {
    this.setData({
      gameOver: true
    });
    this.saveBestScore();
    this.showGameOverModal();
  },

  // 全局翻倍函数
  globalBlockDouble() {
    const board = this.data.board.map(row => [...row])
    let minValue = Infinity
    
    for (let i = 0; i < this.data.size; i++) {
      for (let j = 0; j < this.data.size; j++) {
        if (board[i][j] > 0 && board[i][j] < minValue) {
          minValue = board[i][j]
        }
      }
    }

    if (minValue === Infinity) {
      wx.showToast({
        title: '没有可翻倍的方块',
        icon: 'none'
      });
      return
    }

    let count = 0;
    for (let i = 0; i < this.data.size; i++) {
      for (let j = 0; j < this.data.size; j++) {
        if (board[i][j] === minValue) {
          board[i][j] *= 2;
          count++;
        }
      }
    }

    if (count > 0) {
      this.setData({
        board
      })
      wx.showToast({
        title: `全场${minValue}翻倍成功！`,
        icon: 'success'
      })
    }
  },

  // 向左移动
  moveLeft(board, animationClasses) {
    let moved = false;
    let scoreAdded = 0;

    for (let row = 0; row < this.data.size; row++) {
      const line = board[row].filter(val => val !== 0)

      for (let i = 0; i < line.length - 1; i++) {
        if (line[i] === line[i + 1]) {
          const mergedValue = line[i] * 2;
          line[i] = mergedValue;
          scoreAdded += mergedValue;
          line[i + 1] = 0;
          animationClasses[row][i] = 'merge-effect';
        }
      }
      
      const newLine = line.filter(val => val !== 0)
      while (newLine.length < this.data.size) {
        newLine.push(0)
      }

      for (let col = 0; col < this.data.size; col++) {
        if (board[row][col] !== newLine[col]) {
          moved = true
          if (newLine[col] !== 0) {
            animationClasses[row][col] = 'slide-left';
          }
        }
        board[row][col] = newLine[col]
      }
    }

    return { moved, scoreAdded };
  },

  // 向右移动
  moveRight(board, animationClasses) {
    let moved = false;
    let scoreAdded = 0;

    for (let row = 0; row < this.data.size; row++) {
      const line = board[row].filter(val => val !== 0)
      
      for (let i = line.length - 1; i > 0; i--) {
        if (line[i] === line[i - 1]) {
          const mergedValue = line[i] * 2;
          line[i] = mergedValue;
          scoreAdded += mergedValue;
          line[i - 1] = 0;
          animationClasses[row][this.data.size - 1 - (line.length - 1 - i)] = 'merge-effect';
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
            animationClasses[row][col] = 'slide-right';
          }
        }
        board[row][col] = newLine[col]
      }
    }

    return { moved, scoreAdded };
  },

  // 向上移动
  moveUp(board, animationClasses) {
    let moved = false;
    let scoreAdded = 0;

    for (let col = 0; col < this.data.size; col++) {
      const column = [];
      for (let row = 0; row < this.data.size; row++) {
        column.push(board[row][col]);
      }

      const nonZero = column.filter(val => val !== 0);

      for (let i = 0; i < nonZero.length - 1; i++) {
        if (nonZero[i] === nonZero[i + 1]) {
          const mergedValue = nonZero[i] * 2;
          nonZero[i] = mergedValue;
          scoreAdded += mergedValue;
          nonZero[i + 1] = 0;
          animationClasses[i][col] = 'merge-effect';
        }
      }

      const newColumn = nonZero.filter(val => val !== 0);
      while (newColumn.length < this.data.size) {
        newColumn.push(0);
      }

      for (let row = 0; row < this.data.size; row++) {
        if (board[row][col] !== newColumn[row]) {
          moved = true;
          if (newColumn[row] !== 0) {
            animationClasses[row][col] = 'slide-up';
          }
        }
        board[row][col] = newColumn[row];
      }
    }

    return { moved, scoreAdded };
  },

  // 向下移动
  moveDown(board, animationClasses) {
    let moved = false;
    let scoreAdded = 0;

    for (let col = 0; col < this.data.size; col++) {
      const column = [];
      for (let row = 0; row < this.data.size; row++) {
        column.push(board[row][col]);
      }

      const nonZero = column.filter(val => val !== 0);

      for (let i = nonZero.length - 1; i > 0; i--) {
        if (nonZero[i] === nonZero[i - 1]) {
          const mergedValue = nonZero[i] * 2;
          nonZero[i] = mergedValue;
          scoreAdded += mergedValue;
          nonZero[i - 1] = 0;
          animationClasses[this.data.size - 1 - (nonZero.length - 1 - i)][col] = 'merge-effect';
        }
      }

      const newColumn = nonZero.filter(val => val !== 0);
      while (newColumn.length < this.data.size) {
        newColumn.unshift(0);
      }

      for (let row = 0; row < this.data.size; row++) {
        if (board[row][col] !== newColumn[row]) {
          moved = true;
          if (newColumn[row] !== 0) {
            animationClasses[row][col] = 'slide-down';
          }
        }
        board[row][col] = newColumn[row];
      }
    }

    return { moved, scoreAdded };
  },

  // 修复后的游戏结束检测
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

    // 检查是否可以水平合并
    for (let i = 0; i < this.data.size; i++) {
      for (let j = 0; j < this.data.size - 1; j++) {
        if (board[i][j] === board[i][j + 1] && board[i][j] !== 0) {
          return false
        }
      }
    }

    // 检查是否可以垂直合并
    for (let i = 0; i < this.data.size - 1; i++) {
      for (let j = 0; j < this.data.size; j++) {
        if (board[i][j] === board[i + 1][j] && board[i][j] !== 0) {
          return false
        }
      }
    }

    return true
  },

  // 触摸事件处理
  onTouchStart(e) {
    if (this.data.selectingBlock) {
      const touch = e.touches[0];
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.getBoardRect().then(rect => {
        this.boardRect = rect;
      });
      return;
    }

    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
  },

  onTouchMove(e) {
    if (this.data.selectingBlock) {
      const touch = e.touches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;

      const boardRect = this.getBoardRect();
      if (!boardRect) return;

      const cellSize = boardRect.width / this.data.size;
      const row = Math.floor((endY - boardRect.top) / cellSize);
      const col = Math.floor((endX - boardRect.left) / cellSize);

      if (row >= 0 && row < this.data.size && col >= 0 && col < this.data.size) {
        this.setData({
          selectedBlock: { row, col }
        });
      }
    }
  },

  getBoardRect() {
    const query = wx.createSelectorQuery();
    query.select('.game-board').boundingClientRect();
    return new Promise(resolve => {
      query.exec(res => {
        resolve(res[0]);
      });
    });
  },

  onTouchEnd(e) {
    if (this.data.selectingBlock) {
      this.doubleSelectedBlock();
      return;
    }

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

  // 点击选择方块
  onTapBlock(e) {
    if (!this.data.selectingBlock) return;

    const { row, col } = e.currentTarget.dataset;
    this.setData({
      selectedBlock: { row, col }
    });

    this.doubleSelectedBlock();
  },

  // 修改后的重新开始游戏方法
  restart() {
    // 检查游戏是否已经结束
    if (this.data.gameOver) {
      // 游戏已结束，直接重新开始
      this.initGame();
      wx.showToast({
        title: '新游戏开始!',
        icon: 'success',
        duration: 1000
      });
    } else {
      // 游戏尚未结束，显示确认提示
      wx.showModal({
        title: '确认重新开始',
        content: '新游戏会重置分数，是否开启新游戏？',
        confirmText: '确定',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 用户确认，开始新游戏
            this.initGame();
            wx.showToast({
              title: '新游戏开始!',
              icon: 'success',
              duration: 1000
            });
          }
          // 用户取消，不做任何操作
        }
      });
    }
  },

  // 修复后的游戏结束弹窗
  showGameOverModal() {
    const canRewind = this.data.characterSkill === 'timeRewind' && 
                     this.data.skillState.timeRewind.count > 0 &&
                     this.data.skillState.timeRewind.history.length > 0;
    
    if (canRewind) {
      wx.showModal({
        title: '游戏结束',
        content: `得分: ${this.data.score}\n最高分: ${this.data.bestScore}\n\n是否使用时光回溯继续游戏？`,
        confirmText: '时光回溯',
        cancelText: '结束游戏',
        success: (res) => {
          if (res.confirm) {
            this.timeRewindSkill();
          } else {
            this.showFinalGameOverModal();
          }
        }
      });
    } else {
      this.showFinalGameOverModal();
    }
  },

  // 最终游戏结束弹窗
  showFinalGameOverModal() {
    wx.showModal({
      title: '游戏结束',
      content: `得分: ${this.data.score}\n最高分: ${this.data.bestScore}`,
      confirmText: '新游戏',
      cancelText: '返回首页',
      success: (res) => {
        if (res.confirm) {
          this.restart();
        } else {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

  // 加载最高分
  loadBestScore() {
    const bestScore = wx.getStorageSync('2048-best') || 0
    this.setData({
      bestScore: bestScore
    })
  },

  // 保存最高分
  saveBestScore() {
    if (this.data.score > this.data.bestScore) {
      this.setData({
        bestScore: this.data.score
      })
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