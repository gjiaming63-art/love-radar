# Manual Chat Cases

Use these after setting `DEEPSEEK_API_KEY` to confirm outputs differ by content.

## 1. 敷衍回避型

```text
我：周末要不要一起吃饭？
TA：到时候再看吧
我：那你大概哪天方便？
TA：最近都挺忙的
我：感觉我们一直没定下来
TA：别想太多，顺其自然
我：那你是想继续了解吗？
TA：我也说不好，先这样吧
```

Expected: avoidance / breadcrumbing scores higher, tags around 回避承诺、低投入、模糊关系.

## 2. 真诚沟通型

```text
我：你最近回复慢，我有点没安全感
TA：对不起，我这两天项目确实忙，不是故意冷你
TA：我今晚十点后可以认真聊一下
我：我希望我们沟通更稳定一点
TA：可以，我也想继续了解你。以后忙的时候我会提前说
TA：周六下午我空，我们可以见面聊
```

Expected: sincerity higher, avoidance / coldViolence lower, suggestions around continued communication.

## 3. 冷暴力型

```text
我：你怎么突然不回消息了？
TA：……
我：如果我哪里让你不舒服，可以直接说
TA：随便你怎么想
我：我们需要沟通一下
TA：没什么好说的
我：你这样消失我会很难受
TA：那你就别找我
```

Expected: coldViolence / avoidance higher, red flags quote silence or “随便你怎么想”.
