Page({
  data: {
    bestScore: 0,
    currentCharacterIndex: 0,
    characters: [
      {
        id: 1,
        name: '时光回溯者',
        avatar: '⏳',
        description: '掌控时间的力量',
        skill: 'timeRewind',
        skillDescription: '可回到5步前的游戏状态'
      },
      {
        id: 2,
        name: '时空守护者',
        avatar: '🔮',
        description: '守护关键时刻',
        skill: 'timeRewind',
        skillDescription: '可回到特定分数的游戏状态'
      },
      {
        id: 3,
        name: '时间掌控师',
        avatar: '⚡',
        description: '扭转时空的大师',
        skill: 'timeRewind',
        skillDescription: '拥有3次时光回溯机会'
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