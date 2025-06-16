Page({
  data: {
    bestScore: 0,
    currentCharacterIndex: 0,
    characters: [
      {
        id: 1,
        name: '时光回溯者',
        avatar: '⏳',
        description: '掌控时间与分数的回溯之力',
        skill: 'timeRewind',
        skillDescription: '可回到5步前的分数和状态\n'+
                          '每2000分获得1次新机会\n'+
                          '初始3次机会'
      },
      {
        id: 2,
        name: '方块消除者',
        avatar: '🗑️',
        description: '操控棋盘方块的清除专家',
        skill: 'squareEliminate',
        skillDescription: '每1500分获得1次消除机会\n'+'可清除中间四格或非边缘直线方块\n'+'得消除分数总和'
      },
      {
        id: 3,
        name: '数值倍增师',
        avatar: '×2',
        description: '主宰方块数值的成长大师',
        skill: 'blockDouble',
        skillDescription: '每1000分可指定方块翻倍\n'+'每3000分使全场最低级方块翻倍'
      }
    ]
  },

  onLoad() {
    this.loadBestScore()
  },

  onShow() {
    // 每次显示页面时都重新加载最高分，以防从游戏页返回时分数有更新
    this.loadBestScore()
  },

  // 加载历史最高分
  loadBestScore() {
    const bestScore = wx.getStorageSync('2048-best') || 0
    this.setData({ bestScore: bestScore })
  },

  // 角色切换 - 左滑
  onSwipeLeft() {
    const nextIndex = (this.data.currentCharacterIndex + 1) % this.data.characters.length
    this.setData({ currentCharacterIndex: nextIndex })
  },

  // 角色切换 - 右滑
  onSwipeRight() {
    const prevIndex = this.data.currentCharacterIndex === 0 
      ? this.data.characters.length - 1 
      : this.data.currentCharacterIndex - 1
    this.setData({ currentCharacterIndex: prevIndex })
  },

  // 触摸开始
  onTouchStart(e) {
    this.startX = e.touches[0].clientX
  },

  // 触摸结束 - 处理滑动
  onTouchEnd(e) {
    if (!this.startX) return

    const endX = e.changedTouches[0].clientX
    const diffX = this.startX - endX

    // 滑动距离大于50才触发
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // 向左滑动，显示下一个角色
        this.onSwipeLeft()
      } else {
        // 向右滑动，显示上一个角色
        this.onSwipeRight()
      }
    }

    this.startX = null
  },

  // 点击左箭头
  onPrevCharacter() {
    this.onSwipeRight()
  },

  // 点击右箭头
  onNextCharacter() {
    this.onSwipeLeft()
  },

  // 开始游戏
  startGame() {
    const selectedCharacter = this.data.characters[this.data.currentCharacterIndex]
    
    // 显示选择确认
    wx.showModal({
      title: '角色确认',
      content: `选择 ${selectedCharacter.name}\n技能：${selectedCharacter.skillDescription}`,
      confirmText: '开始游戏',
      cancelText: '重新选择',
      success: (res) => {
        if (res.confirm) {
          // 跳转到游戏页面，并传递角色信息
          wx.navigateTo({
            url: `/pages/game/game?character=${selectedCharacter.id}&skill=${selectedCharacter.skill}&name=${selectedCharacter.name}`
          })
        }
      }
    })
  },

  // 查看角色详情
  onCharacterTap() {
    const character = this.data.characters[this.data.currentCharacterIndex]
    wx.showModal({
      title: character.name,
      content: `${character.description}\n\n技能详情：${character.skillDescription}`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: `我的2048最高分是${this.data.bestScore}分！快来挑战我吧！`,
      path: '/pages/index/index'
    }
  }
})