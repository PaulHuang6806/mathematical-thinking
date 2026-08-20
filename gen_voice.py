# -*- coding: utf-8 -*-
"""
Mathematical Thinking · 语音包生成器
用 edge-tts 合成可爱童声风格语音（晓伊 + 高音调 + 稍快语速），
全部 base64 内联进 js/voice-data.js —— 任何打开方式（file:// / http / 线上）都能播放，
断网可玩；浏览器无 Web Speech 也不怕。
用法: python gen_voice.py   （需要 edge-tts: pip install edge-tts）
"""
import asyncio
import base64
import os
import subprocess
import sys

import edge_tts

VOICE = "zh-CN-XiaoyiNeural"   # 晓伊：明亮活泼的女声，适合儿童内容
RATE = "+8%"                   # 稍快，活泼
PITCH = "+40Hz"                # 音调上调，更可爱
# 低码率压缩：16kbps mono 22050Hz（约 36% 体积），保证 voice-data.js 足够小，
# 移动网络可快速加载（历史教训：48kbps 时 voice-data.js 5.87MB，国内网络下载挂起导致页面点击无反应）
BITRATE = "16k"
SAMPLE_RATE = 22050
SIZE_THRESHOLD = 10000  # 高于此字节数视为未压缩的高码率文件，需转码

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio")
DATA_JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "js", "voice-data.js")

# ---------------- 语音清单: (文本, 文件名) ----------------
VOICES = []

def add(text, name):
    VOICES.append((text, name))

# 题干
add("数一数，一共有几个呀？", "prompt_count")
add("哪个更大？", "prompt_bigger")
add("哪个更小？", "prompt_smaller")
add("这是什么图形呀？", "prompt_shape")
for name in ["圆形", "三角形", "正方形", "长方形", "五角星", "心形", "椭圆形", "菱形", "六边形", "月牙形"]:
    add(f"找出{name}", f"find_{name}")

# 表扬（一次答对 · 过程导向）
add("太棒啦，一次就答对！", "praise_first_1")
add("你真认真！", "praise_first_2")
add("我看到了你的努力！", "praise_first_3")
add("数得又快又准！", "praise_first_4_num")
add("认得又快又准！", "praise_first_4_geo")
add("好厉害，继续加油！", "praise_first_5")
add("你越来越棒啦！", "praise_first_6")
add("哇，数得真清楚！", "praise_first_7_num")
add("哇，一下就找到啦！", "praise_first_7_geo")
add("小手一点就对啦！", "praise_first_8")
add("猫头鹰都看呆啦！", "praise_first_9")
add("一个都没数错！", "praise_first_10_num")
add("一眼就认出它啦！", "praise_first_10_geo")
# 连对庆祝（连续 3 个金星 · 猫头鹰飞到屏幕中间）
add("哇哇哇！连对啦，太厉害啦！", "praise_streak_1")
add("猫头鹰飞过来给你鼓掌！", "praise_streak_2")
add("太棒啦！我们继续！", "praise_streak_3")
add("你好厉害，像小超人一样！", "praise_streak_4")
add("哇！我都想跟你学啦！", "praise_streak_5")
add("连对啦连对啦！继续冲！", "praise_streak_6")
add("哗——！又答对啦！", "praise_streak_7")
# 大庆祝（连续 5 个金星 · 猫头鹰正中星星雨）
add("哇——！太厉害啦！星星都飞起来啦！", "praise_huge_1")
add("你是今天的数学小冠军！", "praise_huge_2")
add("猫头鹰都转圈圈啦！太棒啦！", "praise_huge_3")
add("哇！我已经跟不上你啦！", "praise_huge_4")
# 表扬（重试答对）
add("答对啦！再试一次就成功啦！", "praise_retry_1")
add("坚持就是胜利！", "praise_retry_2")
add("你看，多试就能做到！", "praise_retry_3")
add("进步啦！", "praise_retry_4")
# 鼓励（答错）
add("没关系，再数一次嘛", "encourage_num_1")
add("没关系，再想想嘛", "encourage_logic_1")
add("别急，慢慢来", "encourage_num_2")
add("再仔细看看哦", "encourage_share")
add("你可以的，再试试", "encourage_share_2")
add("没关系，再找一次嘛", "encourage_geo_1")
add("别急，慢慢看", "encourage_geo_2")

# 数感提示 / 数字 / 揭晓
add("再数一次，比比看", "hint_compare")
for n in range(1, 19):
    add(str(n), f"num_{n}")
for n in range(1, 16):
    add(f"是 {n} 个，我们一起记住它", f"reveal_count_{n}")
for n in range(1, 19):
    add(f"答案是 {n}，记住它的样子", f"reveal_cmp_{n}")

# 几何提示（第 2 次答错时: 图形名+特征）/ 揭晓
geo_hints = [
    ("圆形", "圆圆的，没有角"), ("三角形", "有三个尖尖的角"), ("正方形", "四条一样长的边"),
    ("长方形", "四条边，两条长两条短"), ("五角星", "有五个尖尖的角"), ("心形", "像一颗爱心"),
    ("椭圆形", "像鸡蛋一样，长长的圆"), ("菱形", "像风筝一样，四个角"), ("六边形", "有六条边"),
    ("月牙形", "像弯弯的月亮"),
]
for name, hint in geo_hints:
    add(f"{name}，{hint}", f"geo_hint_{name}")
    add(f"这是{name}，我们一起记住它", f"geo_reveal_{name}")

# 其他
add("声音已打开", "sound_on")

# ============ 逻辑模块（找规律 / 找不同 / 谁最高） ============
# 题干
add("找规律，下一个是什么呀？", "prompt_pattern")
add("哪一个不一样呀？", "prompt_odd")
add("仔细听，想一想", "prompt_infer")
# 提示
add("看看前面是怎么排的", "hint_pattern_1")
add("两个两个一组，跟着排", "hint_pattern_2")
add("三个一组，轮流排", "hint_pattern_3")
add("每个都比前面多几个？", "hint_pattern_num")
add("每次都加一，想一想", "hint_pattern_step1")
add("每次都加二，想一想", "hint_pattern_step2")
add("每次都加三，想一想", "hint_pattern_step3")
add("每次都少两个，想一想", "hint_pattern_stepm2")
add("找找哪一个和别的不一样", "hint_odd_1")
add("看看它们的颜色", "hint_odd_2")
add("它们是一家的吗？", "hint_odd_3")
add("想想谁比谁高", "hint_infer_1")
add("想想谁比谁快", "hint_infer_1b")
add("想想谁比谁大", "hint_infer_1c")
add("想想谁比谁重", "hint_infer_1d")
add("再听一遍条件，慢慢想", "hint_infer_2")
# 找规律揭晓（数字答案 2..14 全预合成；图案揭晓用通用句）
for n in range(2, 15):
    add(f"是 {n}，规律被你发现啦！", f"reveal_pattern_num_{n}")
add("是它，规律被你发现啦！", "reveal_pattern_emoji")
# 找不同揭晓
add("它和别的不一样，我们一起记住它", "reveal_odd")

# 谁最高：推理句全量预合成（与 game-logic.js 的 INFER_GROUPS/INFER_ROTATIONS 完全一致，保证查表命中）
INFER_GROUPS = [
    ("高", "高", "矮", "谁最高？", "谁最矮？", "谁在中间？",
     [("小熊", "🐻"), ("小兔", "🐰"), ("小鸡", "🐔")]),
    ("高", "高", "矮", "谁最高？", "谁最矮？", "谁在中间？",
     [("长颈鹿", "🦒"), ("大象", "🐘"), ("小猴", "🐵")]),
    ("跑得快", "快", "慢", "谁最快？", "谁最慢？", "谁在中间？",
     [("小兔", "🐇"), ("乌龟", "🐢"), ("蜗牛", "🐌")]),
    ("大", "大", "小", "谁最大？", "谁最小？", "谁在中间？",
     [("大象", "🐘"), ("小猪", "🐷"), ("小鸡", "🐔")]),
    ("重", "重", "轻", "谁最重？", "谁最轻？", "谁在中间？",
     [("大象", "🐘"), ("奶牛", "🐮"), ("小猪", "🐷")]),
    ("跑得快", "快", "慢", "谁最快？", "谁最慢？", "谁在中间？",
     [("小猫", "🐱"), ("小狗", "🐶"), ("小鸭", "🦆")]),
]
ROTATIONS = [(0, 1, 2), (1, 2, 0), (2, 0, 1)]
QUESTIONS = ["谁最高？", "谁最矮？", "谁在中间？"]
for gi, (attr, _mw, _mn, qmax, qmin, qmid, animals) in enumerate(INFER_GROUPS):
    for pi, rot in enumerate(ROTATIONS):
        A, B, C = (animals[i] for i in rot)
        for ask, q in enumerate([qmax, qmin, qmid]):
            sent = f"{A[0]}比{B[0]}{attr}，{B[0]}比{C[0]}{attr}，{q}"
            add(sent, f"infer_s_{gi}_{pi}_{ask}")
# 推理揭晓（答案动物名单词预合成）
INFER_ANIMALS = ["小熊", "小兔", "小鸡", "长颈鹿", "大象", "小猴", "乌龟", "蜗牛", "小猪", "奶牛", "小猫", "小狗", "小鸭"]
for name in INFER_ANIMALS:
    add(f"答案是{name}", f"reveal_infer_{name}")
# 逻辑模块专属表扬
add("规律被你发现啦！", "praise_logic_pattern")
add("眼睛真尖！", "praise_logic_odd")
add("推理小能手！", "praise_logic_infer")

# 猫头鹰吉祥物专属
add("开始啦，我们一起玩吧！", "owl_start")
add("哇，太厉害啦！", "owl_perfect")
add("再来一局吧！", "owl_end")

# ============ 计算模块（加法 / 减法） ============
# 题干
add("一共有几个呀？", "prompt_add")
add("还剩几个呀？", "prompt_sub")
# 提示（第 1 / 2 次答错）
add("把它们合起来，一起数一数", "hint_add_1")
add("从大的那边开始，接着往后数", "hint_add_2")
add("数一数，没被划掉的还有几个", "hint_sub_1")
add("划掉的不要数，只数剩下的", "hint_sub_2")
# 揭晓：减法"还剩 X 个"（1..15 全预合成；加法"是 X 个"13..15 已在上方扩充）
for n in range(1, 16):
    add(f"还剩 {n} 个，我们一起记住它", f"reveal_sub_{n}")
# 计算模块专属表扬 / 鼓励
add("算得又快又准！", "praise_calc_1")
add("口算小达人！", "praise_calc_2")
add("算得真清楚！", "praise_calc_3")
add("没关系，再算一次嘛", "encourage_calc_1")
add("别急，慢慢算", "encourage_calc_2")

# ============ 时间与空间馆（时钟 / 四季 / 方位 / 星期 / 远近 / 坐标 / 积木 / 月份） ============
# 整点时钟
add("小钟表，几点了呀？", "prompt_ts_clock")
add("看看时针指到几，就是几点", "hint_ts_clock_1")
add("短针是时针，它指着几就是几点", "hint_ts_clock_2")
for n in range(1, 13):
    add(f"是 {n} 点，我们一起记住它", f"ts_clock_reveal_{n}")
# 一年四季
add("这是哪个季节呀？", "prompt_ts_season")
add("花儿都开啦，天气暖和和的", "hint_ts_spring")
add("太阳火辣辣，可以吃西瓜", "hint_ts_summer")
add("树叶黄了，果子熟啦", "hint_ts_autumn")
add("好冷呀，会下雪", "hint_ts_winter")
add("看看图片里的东西，是哪个季节才有的", "hint_ts_season_2")
for name in ["春天", "夏天", "秋天", "冬天"]:
    add(name, f"ts_season_{name}")
    add(f"是{name}，我们一起记住它", f"ts_season_reveal_{name}")
# 空间方位
add("小鸟在树的哪里？", "prompt_ts_place_top")
add("小乌龟在树的哪里？", "prompt_ts_place_bottom")
add("小兔在树的哪里？", "prompt_ts_place_front")
add("小狐狸在树的哪里？", "prompt_ts_place_back")
add("小狗在女孩的哪边？", "prompt_ts_place_left")
add("小猫在女孩的哪边？", "prompt_ts_place_right")
add("想一想，它在大树的哪个方向", "hint_ts_place_1")
add("看看它和大树的位置", "hint_ts_place_2")
add("伸出右手比一比，哪边是右边", "hint_ts_place_lr_1")
add("女孩的左手边是哪边？想一想", "hint_ts_place_lr_2")
add("真棒，方向找对啦！", "reveal_ts_place")
# 星期
add("明天是星期几？", "prompt_ts_week_tomorrow")
add("昨天是星期几？", "prompt_ts_week_yesterday")
add("后天是星期几？", "prompt_ts_week_dayafter")
add("前天是星期几？", "prompt_ts_week_daybefore")
add("想一想，今天后面是星期几", "hint_ts_week_1")
add("星期一到星期天，按顺序数一数", "hint_ts_week_2")
for name in ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]:
    add(name, f"ts_week_{name}")
    add(f"是{name}，我们一起记住它", f"ts_week_reveal_{name}")
# 比远近
add("谁离房子最近呀？", "prompt_ts_dist_near")
add("谁离房子最远呀？", "prompt_ts_dist_far")
add("看看谁离房子最近", "hint_ts_dist_near")
add("看看谁离房子最远", "hint_ts_dist_far")
add("从房子往外数一数，第一个是谁", "hint_ts_dist_2")
add("真棒！", "reveal_ts_dist")
# 几排几号
add("几排几号，找一找！", "prompt_ts_grid")
add("横着数是排，竖着数是号", "hint_ts_grid_1")
add("先找第几排，再看第几个", "hint_ts_grid_2")
# 积木几块
add("一共有几个正方体呀？", "prompt_ts_blocks")
add("一层一层数，别忘了上面的", "hint_ts_blocks_1")
add("先数最下面一层，再往上数", "hint_ts_blocks_2")
# 月份
add("想一想，是几月？", "prompt_ts_month")
add("按顺序数一数月份", "hint_ts_month_1")
add("一月二月三月…接着往下数", "hint_ts_month_2")
for name in ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]:
    add(name, f"ts_month_{name}")
    add(f"是{name}，我们一起记住它", f"ts_month_reveal_{name}")

# ============ 比较与测量馆（船载重 / 粗细 / 线长短 / 测量工具 / 面积 / 天平 / 水杯 / 蛋糕） ============
# 船载重
add("谁更重呀？", "prompt_ms_heavy")
add("看看谁的船沉得更深", "hint_ms_heavy_1")
add("船沉得深的，更重", "hint_ms_heavy_2")
# 铅笔粗细
add("哪支铅笔最粗呀？", "prompt_ms_thick")
add("哪支铅笔最细呀？", "prompt_ms_thin")
add("看看哪支铅笔最胖", "hint_ms_thick_1")
add("看看哪支铅笔最瘦", "hint_ms_thin_1")
add("胖胖的是粗的，瘦瘦的是细的", "hint_ms_thick_2")
# 线长短
add("哪条线最短呀？", "prompt_ms_line_short")
add("哪条线最长呀？", "prompt_ms_line_long")
add("直直的路是不是最近？", "hint_ms_line_1")
add("弯弯绕绕的，要走更远的路", "hint_ms_line_2")
add("直线最短！", "reveal_ms_line_short")
add("它最长！", "reveal_ms_line_long")
add("弯弯绕绕的路更长", "hint_ms_line_3")
add("数一数，哪条绕得最多", "hint_ms_line_4")
# 测量工具
add("量身高，用什么？", "prompt_ms_tool_height")
add("量桌子，用什么？", "prompt_ms_tool_table")
add("量体温，用什么？", "prompt_ms_tool_temp")
add("量时间，用什么？", "prompt_ms_tool_time")
add("软软的尺子可以围一圈", "hint_ms_tool_1")
add("长长的尺子拉出来量", "hint_ms_tool_2")
add("放在身上量温度", "hint_ms_tool_3")
add("滴答滴答走着的", "hint_ms_tool_4")
add("想一想，它要怎么量", "hint_ms_tool_5")
# 面积
add("两个图形一样大吗？", "prompt_ms_area_same")
add("哪个图形更大呀？", "prompt_ms_area_big")
add("数一数，各有几个小方格", "hint_ms_area_1")
add("格子一样多，就一样大", "hint_ms_area_2")
add("格子多的，就更大", "hint_ms_area_3")
add("它们一样大！", "reveal_ms_area_same")
# 天平推理
add("想一想，谁最重呀？", "prompt_ms_scale_heavy")
add("想一想，谁最轻呀？", "prompt_ms_scale_light")
add("想一想，谁比谁更重", "hint_ms_scale_1")
add("把两个天平连起来想一想", "hint_ms_scale_2")
# 水杯守恒
add("哪杯水最多呀？", "prompt_ms_water")
add("水是从同一个杯子里倒出来的", "hint_ms_water_1")
add("杯子不一样，水一样多哦", "hint_ms_water_2")
add("水一样多！", "reveal_ms_water")
# 蛋糕推理
add("一个圆蛋糕等于几块方蛋糕？", "prompt_ms_cake")
add("想想蛋糕能换几个", "hint_ms_cake_1")
add("数一数，换一换", "hint_ms_cake_2")

# ============ 数与运算馆（相邻数 / 单双数 / 凑十 / 群数 / 人民币 / 缺了几 / 代数） ============
# 相邻数
add("想一想，它的邻居是几？", "prompt_nh_neighbor")
add("比它小 1 的是前面的邻居", "hint_nh_neighbor_1")
add("按顺序数一数，它旁边是谁", "hint_nh_neighbor_2")
# 单数双数
add("是单数还是双数？", "prompt_nh_oddeven")
add("两个两个配成对，配得完的是双数", "hint_nh_oddeven_1")
add("剩下一个，孤零零的是单数", "hint_nh_oddeven_2")
add("单数", "nh_odd")
add("双数", "nh_even")
add("单数，真棒！", "reveal_nh_odd")
add("双数，真棒！", "reveal_nh_even")
# 凑十
add("还需要几个，凑成 10 呀？", "prompt_nh_maketen")
add("看看十格阵，空着几格", "hint_nh_maketen_1")
add("一格一格数空着的格子", "hint_nh_maketen_2")
for n in range(1, 8):
    add(f"再放 {n} 个，就是 10 个啦！", f"reveal_nh_maketen_{n}")
# 群数
add("按群数一数，一共有几个？", "prompt_nh_group")
add("5 个一组，数一数有几组", "hint_nh_group_5")
add("10 个一组，数一数有几组", "hint_nh_group_10")
add("一组一组接着数", "hint_nh_group_2")
for total in [10, 15, 20, 30]:
    add(f"一共有 {total} 个，真棒！", f"reveal_nh_group_{total}")
# 人民币
add("一共多少钱呀？", "prompt_nh_money")
add("把纸币加起来数一数", "hint_nh_money_1")
add("10 元、5 元、1 元，加在一起", "hint_nh_money_2")
for yuan in range(3, 21):
    add(f"一共 {yuan} 元，真棒！", f"reveal_nh_money_{yuan}")
# 缺了几
add("缺了哪个数字呀？", "prompt_nh_missing")
add("按顺序数一数", "hint_nh_missing_1")
add("看看哪一行断开了", "hint_nh_missing_2")
for v in range(1, 19):
    add(f"缺了 {v}，真棒！", f"reveal_nh_missing_{v}")
# 分一分（数的分解：7/16 分解）
add("分一分，另一堆是几个呀？", "prompt_nh_split")
add("想一想，总共几个，分走几个", "hint_nh_split_1")
add("数一数，没分走的有几个", "hint_nh_split_2")
for n in range(1, 16):
    add(f"{n} 个，真棒！", f"reveal_nh_split_{n}")
# 认识符号（= + - > <）
add("想一想，圆圈里是加号还是减号呀？", "prompt_nh_sign_calc")
add("加号是合起来，减号是拿走", "hint_nh_sign_1")
add("想一想，哪个数更大呀？", "prompt_nh_sign_cmp")
add("大大的嘴巴，朝向大的数", "hint_nh_sign_cmp_1")
# 一样多（一一对应 / 数量匹配）
add("找一找，哪一组和它一样多呀？", "prompt_nh_same")
add("一个一个对着数一数", "hint_nh_same_1")
for n in range(3, 11):
    add(f"上面的有 {n} 个，找一找下面哪一组也是 {n} 个", f"hint_nh_same_2_{n}")
add("一样多，真棒！", "reveal_nh_same")
# 认识符号：动态 hint2 的静态同义句
add("想一想，哪个符号合适呀？", "hint_nh_sign_2")
# 代数推理
add("想一想，它等于几？", "prompt_nh_algebra")
add("两个一样的合起来是几", "hint_nh_algebra_1")
add("把它分成两份，每份是几", "hint_nh_algebra_2")

# ============ 形与集合馆（立体图形 / 等分 / 梯形 / 集合 / 拼合 / 填红方块） ============
# 立体图形
add("这是什么立体图形呀？", "prompt_sh_solid")
add("圆圆的，会滚来滚去", "hint_sh_solid_1")
add("方方正正的，六个面", "hint_sh_solid_2")
add("像柱子一样，上下一样粗", "hint_sh_solid_3")
add("尖尖的，像小帐篷", "hint_sh_solid_4")
add("摸摸它的样子，想一想", "hint_sh_solid_5")
for name in ["球体", "正方体", "圆柱体", "圆锥体"]:
    add(name, f"sh_solid_{name}")
    add(f"这是{name}，我们一起记住它", f"sh_solid_reveal_{name}")
# 等分
add("分成了几份呀？", "prompt_sh_equal")
add("数一数，有几份", "hint_sh_equal_1")
add("每份一样多，是平均分", "hint_sh_equal_2")
for n in [2, 3, 4]:
    add(f"分成了 {n} 份，真棒！", f"sh_equal_reveal_{n}")
# 梯形分类
add("哪个不是梯形呀？", "prompt_sh_classify")
add("找找哪一个不一样", "hint_sh_classify_1")
add("梯形有两条平平的边", "hint_sh_classify_2")
add("它不是梯形，真棒！", "reveal_sh_classify")
# 集合包含
add("小三角形里有几个水果呀？", "prompt_sh_include")
add("数一数，小三角形里面的", "hint_sh_include_1")
add("只看小三角形里面的，外面的不算", "hint_sh_include_2")
for n in range(2, 7):
    add(f"有 {n} 个，真棒！", f"reveal_sh_include_{n}")
# 拼合计数
add("用了几块三角形呀？", "prompt_sh_puzzle")
add("数一数，三角形有几块", "hint_sh_puzzle_1")
add("拼在一起，一块一块数", "hint_sh_puzzle_2")
for n in range(2, 6):
    add(f"用了 {n} 块，真棒！", f"reveal_sh_puzzle_{n}")
# 填红方块
add("红色方块该填在哪里呀？", "prompt_sh_redgrid")
add("看看红色方块的规律", "hint_sh_redgrid_1")
add("一排比一排多，找一找", "hint_sh_redgrid_2")

# ============ 语音修复（2026-08-16 全量穷举发现） ============
add("先找排，再找号", "hint_ts_grid_2v")
add("从上往下数第几排，从左往右数第几号", "hint_ts_grid_2r")
add("1 个圆蛋糕等于几块方蛋糕？", "prompt_ms_cake_1")

TOTAL = len(VOICES)
print(f"共 {TOTAL} 条语音，音色 {VOICE} rate={RATE} pitch={PITCH}")


async def synth_one(text, out_path, retries=3):
    for i in range(retries):
        try:
            comm = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
            await comm.save(out_path)
            size = os.path.getsize(out_path)
            if size > 300:  # >0.1s，非空
                return True, size
        except Exception as e:  # noqa: BLE001
            last = e
        await asyncio.sleep(1.0 + i)
    return False, getattr(last, "strerror", str(last))  # type: ignore[name-defined]  # noqa: F821


def is_low_bitrate(path):
    """用 ffprobe 探测实际码率（≤20kbps 视为已压缩）。长句子低码率文件也可能 >10KB，不能只看大小。"""
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a:0",
             "-show_entries", "stream=bit_rate",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, timeout=30, text=True,
        )
        rate = int((r.stdout or "").strip() or 0)
        return rate > 0 and rate <= 20000
    except Exception:  # noqa: BLE001
        return False  # 探测失败按高码率处理（转码无副作用）


def ensure_low_bitrate(name):
    """把 mp3 统一压到低码率（16kbps mono 22050Hz）。

    高码率（edge-tts 默认 48kbps）的 voice-data.js 会超过 5MB，
    移动网络下载挂起会阻塞游戏初始化（历史事故，见 git log 87e023f）。
    小文件直接判低码率；大文件（含长句子的低码率文件）用 ffprobe 精确判断。
    """
    path = os.path.join(OUT_DIR, name + ".mp3")
    if not os.path.exists(path):
        return False
    if os.path.getsize(path) <= SIZE_THRESHOLD or is_low_bitrate(path):
        return True  # 已是低码率
    tmp = path + ".tmp.mp3"
    try:
        r = subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", path,
             "-ac", "1", "-ar", str(SAMPLE_RATE), "-b:a", BITRATE, tmp],
            capture_output=True, timeout=60,
        )
        if r.returncode != 0 or not os.path.exists(tmp):
            print(f"  ! 转码失败 {name}: {r.stderr.decode(errors='ignore')[:120]}")
            return False
        os.replace(tmp, path)
        print(f"  → 已压缩 {name}.mp3 ({os.path.getsize(path)}B)")
        return True
    except Exception as e:  # noqa: BLE001
        print(f"  ! 转码异常 {name}: {e}")
        return False


async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    results = []
    ok = fail = 0
    for idx, (text, name) in enumerate(VOICES, 1):
        path = os.path.join(OUT_DIR, name + ".mp3")
        ensure_low_bitrate(name)  # 存量文件统一低码率（幂等；已低码率立即返回）
        if os.path.exists(path) and os.path.getsize(path) > 300:
            results.append((text, name, os.path.getsize(path)))
            ok += 1
            print(f"[{idx}/{TOTAL}] 复用 {name}.mp3")
            continue
        good, info = await synth_one(text, path)
        if good:
            ensure_low_bitrate(name)  # 新合成的是高码率，立即压缩
            size = os.path.getsize(path)
            results.append((text, name, size))
            ok += 1
            print(f"[{idx}/{TOTAL}] OK {name}.mp3 ({size}B)")
        else:
            fail += 1
            print(f"[{idx}/{TOTAL}] FAIL {name}: {info}")
        await asyncio.sleep(0.2)  # 温和节流，避免限流

    # 生成 voice-data.js（base64 内联，任何协议可播放）
    lines = ["/* 自动生成，勿手改 —— 运行 python gen_voice.py 重新生成 */",
             "// 语音数据：文本 → base64 mp3 data URI。play() 按文本精确查表，缺失时回退 Web Speech。",
             "(function (g) { 'use strict'; g.__VOICE_DATA__ = {"]
    total_b64 = 0
    for text, name, _ in results:
        with open(os.path.join(OUT_DIR, name + ".mp3"), "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        total_b64 += len(b64)
        esc = text.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'  "{esc}": "data:audio/mpeg;base64,{b64}",')
    lines.append("}; })(typeof window !== 'undefined' ? window : globalThis);")
    with open(DATA_JS, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\n合成成功 {ok} 条，失败 {fail} 条")
    print(f"voice-data.js: {os.path.getsize(DATA_JS)/1024:.0f} KB（含 base64 语音）")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
