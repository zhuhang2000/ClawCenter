/**
 * Echo Maze Background Music System
 * 赛博朋克风格自适应背景音乐
 * 支持光明/黑暗模式自动切换音乐风格
 */

// 音乐系统状态
let musicState = {
  audioContext: null,
  isPlaying: false,
  isMuted: false,
  volume: 0.5,
  currentMode: 'light', // 'light' or 'dark'
  oscillators: [],
  gainNodes: [],
  lfoNodes: [],
  filterNode: null,
  reverbNode: null,
  delayNode: null,
  masterGain: null,
  sequencerInterval: null,
  noteIndex: 0
};

// 赛博朋克风格音阶
const CYBERPUNK_SCALES = {
  light: [220, 261.63, 329.63, 392, 493.88, 523.25, 659.25, 783.99], // A3, C4, E4, G4, B4, C5, E5, G5
  dark: [110, 130.81, 164.81, 196, 246.94, 261.63, 329.63, 392]    // A2, C3, E3, G3, B3, C4, E4, G4
};

// 节奏模式
const RHYTHM_PATTERNS = {
  light: [1, 0, 1, 0, 1, 1, 0, 1],  // 轻快节奏
  dark: [1, 0, 0, 1, 0, 1, 0, 0]    // 深沉节奏
};

// 初始化音频上下文
function initAudioContext() {
  if (!musicState.audioContext) {
    musicState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    createAudioGraph();
  }
}

// 创建音频处理图
function createAudioGraph() {
  const ctx = musicState.audioContext;
  
  // 主增益节点
  musicState.masterGain = ctx.createGain();
  musicState.masterGain.gain.value = musicState.volume;
  
  // 滤波器（模拟赛博朋克音色）
  musicState.filterNode = ctx.createBiquadFilter();
  musicState.filterNode.type = 'lowpass';
  musicState.filterNode.frequency.value = 2000;
  musicState.filterNode.Q.value = 5;
  
  // 延迟效果（营造空间感）
  musicState.delayNode = ctx.createDelay();
  musicState.delayNode.delayTime.value = 0.3;
  const delayGain = ctx.createGain();
  delayGain.gain.value = 0.3;
  
  // 混响效果（简单模拟）
  musicState.reverbNode = ctx.createConvolver();
  // 创建简单的脉冲响应
  const rate = ctx.sampleRate;
  const length = rate * 2; // 2秒
  const impulse = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    }
  }
  musicState.reverbNode.buffer = impulse;
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.2;
  
  // 连接音频图
  // 滤波器 -> 延迟 -> 混响 -> 主增益 -> 输出
  musicState.filterNode.connect(musicState.delayNode);
  musicState.delayNode.connect(delayGain);
  delayGain.connect(musicState.filterNode); // 反馈
  
  musicState.filterNode.connect(musicState.reverbNode);
  musicState.reverbNode.connect(reverbGain);
  reverbGain.connect(musicState.masterGain);
  
  musicState.filterNode.connect(musicState.masterGain);
  musicState.masterGain.connect(ctx.destination);
}

// 创建振荡器（合成器声音）
function createOscillator(frequency, type = 'sawtooth', detune = 0) {
  const ctx = musicState.audioContext;
  
  // 主振荡器
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  osc.detune.value = detune;
  
  // 副振荡器（增加厚度）
  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.value = frequency;
  osc2.detune.value = detune + 7; // 轻微失谐
  
  // 增益包络
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  
  // 连接
  osc.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(musicState.filterNode);
  
  // 保存引用
  musicState.oscillators.push(osc, osc2);
  musicState.gainNodes.push(gainNode);
  
  return { osc, osc2, gainNode };
}

// 播放音符（带 ADSR 包络）
function playNote(frequency, duration = 0.25, velocity = 0.5) {
  const ctx = musicState.audioContext;
  const now = ctx.currentTime;
  
  const { osc, osc2, gainNode } = createOscillator(frequency);
  
  // ADSR 包络
  const attack = 0.05;
  const decay = 0.1;
  const sustain = velocity * 0.6;
  const release = 0.3;
  
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(velocity, now + attack);
  gainNode.gain.exponentialRampToValueAtTime(sustain, now + attack + decay);
  gainNode.gain.setValueAtTime(sustain, now + duration - release);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
  
  // 启动振荡器
  osc.start(now);
  osc2.start(now);
  osc.stop(now + duration + 0.1);
  osc2.stop(now + duration + 0.1);
  
  // 清理
  setTimeout(() => {
    const idx = musicState.oscillators.indexOf(osc);
    if (idx > -1) musicState.oscillators.splice(idx, 2);
    const gidx = musicState.gainNodes.indexOf(gainNode);
    if (gidx > -1) musicState.gainNodes.splice(gidx, 1);
  }, (duration + 0.2) * 1000);
}

// 音序器 - 自动生成背景音乐
function startSequencer() {
  if (musicState.sequencerInterval) return;
  
  const bpm = 100;
  const beatDuration = 60 / bpm / 2; // 8分音符
  
  musicState.sequencerInterval = setInterval(() => {
    if (!musicState.isPlaying || musicState.isMuted) return;
    
    const mode = musicState.currentMode;
    const scale = CYBERPUNK_SCALES[mode];
    const pattern = RHYTHM_PATTERNS[mode];
    
    // 获取当前节拍
    const step = musicState.noteIndex % pattern.length;
    
    // 根据节奏模式播放音符
    if (pattern[step]) {
      // 主音符
      const noteIndex = Math.floor(Math.random() * (scale.length - 2)) + 2;
      playNote(scale[noteIndex], beatDuration * 2, 0.4);
      
      // 偶尔添加低音
      if (Math.random() > 0.6) {
        setTimeout(() => {
          playNote(scale[0], beatDuration * 3, 0.5);
        }, beatDuration * 500);
      }
      
      // 偶尔添加高音装饰
      if (Math.random() > 0.7) {
        setTimeout(() => {
          playNote(scale[scale.length - 1], beatDuration, 0.25);
        }, beatDuration * 200);
      }
    }
    
    // 更新滤波器频率（根据模式）
    if (musicState.filterNode) {
      const baseFreq = mode === 'light' ? 3000 : 1200;
      const mod = Math.sin(Date.now() / 1000) * 500;
      musicState.filterNode.frequency.setTargetAtTime(baseFreq + mod, musicState.audioContext.currentTime, 0.1);
    }
    
    musicState.noteIndex++;
  }, beatDuration * 1000);
}

function stopSequencer() {
  if (musicState.sequencerInterval) {
    clearInterval(musicState.sequencerInterval);
    musicState.sequencerInterval = null;
  }
}

// 切换播放状态
function toggleMusic() {
  initAudioContext();
  
  if (musicState.isPlaying) {
    musicState.isPlaying = false;
    stopSequencer();
    updateMusicUI();
    return false;
  } else {
    musicState.isPlaying = true;
    startSequencer();
    updateMusicUI();
    return true;
  }
}

// 设置音量
function setVolume(value) {
  musicState.volume = Math.max(0, Math.min(1, value));
  if (musicState.masterGain) {
    musicState.masterGain.gain.setTargetAtTime(musicState.volume, musicState.audioContext.currentTime, 0.1);
  }
}

// 切换静音
function toggleMute() {
  musicState.isMuted = !musicState.isMuted;
  if (musicState.masterGain) {
    const targetVolume = musicState.isMuted ? 0 : musicState.volume;
    musicState.masterGain.gain.setTargetAtTime(targetVolume, musicState.audioContext.currentTime, 0.1);
  }
  updateMusicUI();
}

// 更新音乐UI
function updateMusicUI() {
  const icon = document.getElementById('musicIcon');
  const text = document.getElementById('musicText');
  const status = document.getElementById('musicStatus');
  
  if (!icon || !text || !status) return;
  
  if (musicState.isMuted) {
    icon.textContent = '🔇';
    text.textContent = '已静音';
    status.textContent = '🔇 音乐已静音';
  } else if (musicState.isPlaying) {
    icon.textContent = '⏸️';
    text.textContent = '暂停音乐';
    status.textContent = musicState.currentMode === 'light' 
      ? '🎵 播放中 - 光明主题' 
      : '🎵 播放中 - 黑暗主题';
  } else {
    icon.textContent = '▶️';
    text.textContent = '播放音乐';
    status.textContent = '🎵 点击播放沉浸音景';
  }
}

// 根据游戏模式切换音乐风格
function setMusicMode(mode) {
  if (musicState.currentMode === mode) return;
  
  musicState.currentMode = mode;
  
  // 平滑过渡滤波器
  if (musicState.filterNode) {
    const targetFreq = mode === 'light' ? 3500 : 1000;
    musicState.filterNode.frequency.setTargetAtTime(targetFreq, musicState.audioContext.currentTime, 0.5);
  }
  
  updateMusicUI();
}

// 初始化音乐系统（由游戏调用）
function initMusicSystem() {
  // 绑定UI事件
  const btnMusic = document.getElementById('btnMusicToggle');
  const volumeSlider = document.getElementById('volumeSlider');
  
  if (btnMusic) {
    btnMusic.addEventListener('click', toggleMusic);
  }
  
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) / 100;
      setVolume(value);
      document.getElementById('volumeValue').textContent = e.target.value + '%';
    });
  }
  
  updateMusicUI();
  console.log('🎵 Music system initialized. Click play to start.');
}

// 清理音乐资源（游戏重置时调用）
function cleanupMusic() {
  stopSequencer();
  
  // 停止所有振荡器
  musicState.oscillators.forEach(osc => {
    try {
      osc.stop();
      osc.disconnect();
    } catch (e) {}
  });
  
  // 断开所有节点
  musicState.gainNodes.forEach(gain => {
    try {
      gain.disconnect();
    } catch (e) {}
  });
  
  // 清空数组
  musicState.oscillators = [];
  musicState.gainNodes = [];
  musicState.lfoNodes = [];
  
  musicState.isPlaying = false;
  updateMusicUI();
}

// 导出给游戏使用
if (typeof window !== 'undefined') {
  window.MusicSystem = {
    init: initMusicSystem,
    toggle: toggleMusic,
    setVolume: setVolume,
    setMode: setMusicMode,
    cleanup: cleanupMusic,
    get state() { return musicState; }
  };
}
