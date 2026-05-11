let capture;
let faceMesh;
let handPose;
let faces = [];
let hands = [];
let earringImages = []; // 儲存多張耳環圖片的陣列
let currentEarringIndex = 1;  
let fingerCount = 1// 用於儲存當前手指數量，以便在畫面上顯示

// preload() 函式會在 setup() 之前執行，用於載入外部資源
function preload() {
  // 載入 5 張耳環圖片
  earringImages[1] = loadImage('圖片/acc1_ring.png');
  earringImages[2] = loadImage('圖片/acc2_pearl.png');
  earringImages[3] = loadImage('圖片/acc3_tassel.png');
  earringImages[4] = loadImage('圖片/acc4_jade.png');
  earringImages[5] = loadImage('圖片/acc5_phoenix.png');
}

function setup() {
  // 建立填滿整個視窗的全螢幕畫布
  createCanvas(windowWidth, windowHeight);

  // 啟動攝影機擷取功能
  capture = createCapture(VIDEO);
  // 隱藏預設出現在畫布下方的 HTML5 影片元件，改在畫布內手動繪製
  capture.hide();

  // 初始化 ml5 faceMesh 辨識模型 (v1 版本 API)
  faceMesh = ml5.faceMesh(capture, { maxFaces: 1 }, modelReady);

  // 初始化 ml5 handPose 辨識模型
  handPose = ml5.handPose(capture, { maxHands: 1 }, modelReady);
}

function modelReady() {
  // 當任一模型載入完成後，確保兩者都啟動偵測
  faceMesh.detectStart(capture, gotFaces);
  handPose.detectStart(capture, gotHands);
}

function gotFaces(results) {
  faces = results;
}

function gotHands(results) {
  hands = results;
}

function draw() {
  // 設定背景顏色為 e7c6ff
  background('#e7c6ff');

  // 計算顯示影像的寬度與高度 (全螢幕寬高的 50%)
  let displayW = width * 0.5;
  let displayH = height * 0.5;

  // 計算將影像置於視窗中間的座標
  let x = (width - displayW) / 2;
  let y = (height - displayH) / 2;

  push();
  // 實作左右顛倒（鏡像效果）：
  // 1. 移動原點到影像預計顯示區域的右側邊界 (x + displayW)
  // 2. 利用 scale(-1, 1) 將水平軸反轉
  translate(x + displayW, y);
  scale(-1, 1);

  // 繪製影像，起始點設為 (0, 0)
  imageMode(CORNER); // 確保攝影機影像從左上角開始繪製
  image(capture, 0, 0, displayW, displayH);

  // 檢查手勢並更新耳環索引
  updateEarringSelection();

  // 如果辨識到臉部，則繪製耳垂位置
  if (faces && faces.length > 0 && earringImages[currentEarringIndex]) {
    let face = faces[0];

    // 確保關鍵點存在
    if (face.keypoints && face.keypoints.length > 401) {
      // 取得耳垂關鍵點 (177 為右耳垂區域，401 為左耳垂區域)
      let rightLobe = face.keypoints[177];
      let leftLobe = face.keypoints[401];

      // 將辨識座標從攝影機解析度對應到畫布上的顯示尺寸
      let rx = map(rightLobe.x, 0, capture.width, 0, displayW);
      let ry = map(rightLobe.y, 0, capture.height, 0, displayH);
      let lx = map(leftLobe.x, 0, capture.width, 0, displayW);
      let ly = map(leftLobe.y, 0, capture.height, 0, displayH);

      // 繪製耳環圖片
      imageMode(CENTER);
      let earringSize = displayW * 0.08; // 根據影像寬度自動調整耳環大小
      
      // 繪製目前選擇的耳環圖片
      let img = earringImages[currentEarringIndex];
      image(img, rx, ry, earringSize, earringSize);
      image(img, lx, ly, earringSize, earringSize);
    }
  }
  pop();

  // 繪製 UI 文字：顯示目前偵測到的手指數量
  fill(255, 255, 0); // 黃色文字
  stroke(0); // 黑色外框增加文字清晰度
  strokeWeight(4);
  textSize(48);
  textAlign(LEFT, TOP);
  text(`偵測手指數量: ${fingerCount}`, 40, 40);
}

function updateEarringSelection() {
  if (hands && hands.length > 0) {
    let hand = hands[0];
    let count = 0;

    // 辨識邏輯：比較指尖 (Tip) 與第三關節 (MCP) 的高度
    // 在 p5 座標系中，Y 越小代表位置越高
    
    // 食指 (Index Finger)
    if (hand.keypoints[8].y < hand.keypoints[5].y) count++;
    // 中指 (Middle Finger)
    if (hand.keypoints[12].y < hand.keypoints[9].y) count++;
    // 無名指 (Ring Finger)
    if (hand.keypoints[16].y < hand.keypoints[13].y) count++;
    // 小指 (Pinky)
    if (hand.keypoints[20].y < hand.keypoints[17].y) count++;
    
    // 拇指 (Thumb) 辨識邏輯：
    // 拇指通常是水平伸展，所以改用與手掌中心 (或索引點 2) 的水平距離來判斷
    // 這裡為了簡單直觀，判斷拇指尖與關節的相對位置
    let thumbIsOut = dist(hand.keypoints[4].x, hand.keypoints[4].y, hand.keypoints[9].x, hand.keypoints[9].y) > 
                     dist(hand.keypoints[3].x, hand.keypoints[3].y, hand.keypoints[9].x, hand.keypoints[9].y);
    if (thumbIsOut) count++;

    fingerCount = count; // 更新全域變數供 draw() 使用

    // 如果偵測到 1-5 根手指，則更新目前顯示的圖片索引
    if (count >= 1 && count <= 5) {
      currentEarringIndex = count;
    }
  } else {
    fingerCount = 0; // 畫面中沒有手時，數量重設為 0
  }
}

function windowResized() {
  // 當瀏覽器視窗大小改變時，動態調整畫布大小
  resizeCanvas(windowWidth, windowHeight);
}
