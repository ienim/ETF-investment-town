import { useEffect, useState } from "react";
import { PixelAvatar } from "../components/PixelAvatar";
import { PixelButton } from "../components/PixelButton";
import { difficultyConfigs, getDifficultyConfig } from "../data/difficulty";
import type { Difficulty } from "../types/gameplay";
import { ADVANCED_SEED_SLOT_ID, type SaveSlotId, type SaveSlotSummary } from "../utils/saveGame";

interface StartScreenProps {
  hasSavedGame?: boolean;
  onContinue?: () => void;
  onStart: (slotId: SaveSlotId) => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
  onDeleteSlot: (slotId: SaveSlotId) => void;
  selectedDifficulty: Difficulty;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  saveSlots: SaveSlotSummary[];
}

export function StartScreen({
  hasSavedGame,
  onContinue,
  onStart,
  onLoadSlot,
  onDeleteSlot,
  selectedDifficulty,
  onSelectDifficulty,
  saveSlots,
}: StartScreenProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const selectedConfig = getDifficultyConfig(selectedDifficulty);
  const regularSlots = saveSlots.filter((slot) => slot.id !== ADVANCED_SEED_SLOT_ID);
  const preferredSlot = regularSlots.find((slot) => !slot.exists)?.id ?? "slot-1";
  const startSlot = selectedDifficulty === "advanced" ? ADVANCED_SEED_SLOT_ID : preferredSlot;
  const savedSlots = saveSlots.filter((slot) => slot.exists);

  useEffect(() => {
    if (!isGuideOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsGuideOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isGuideOpen]);

  const closeGuide = () => setIsGuideOpen(false);
  const startNow = () => {
    closeGuide();
    onStart(startSlot);
  };

  return (
    <main className="screen fit-screen start-town-screen start-town-screen--immersive">
      <section className="game-frame game-frame--play start-game-frame">
        <div className="town-topbar">
          <header className="town-brand">
            <PixelAvatar kind="cat" size="small" />
            <div className="town-brand__copy">
              <p className="eyebrow">王初一的小镇来信</p>
              <h1>ETF小镇 <span>投资挑战</span></h1>
              <div className="town-level">
                <span>小镇投资家</span>
                <small>Lv.1 交易所门口</small>
                <i aria-hidden="true"><b style={{ width: "18%" }} /></i>
              </div>
            </div>
          </header>

          <div className="start-resource-bar" aria-label="游戏特点">
            <span><small>周期</small><strong>12 天</strong></span>
            <span><small>教学</small><strong>不计时</strong></span>
            <span><small>存读档</small><strong>自动</strong></span>
            <span><small>成长</small><strong>小镇</strong></span>
          </div>

          <div className="town-top-actions">
            <div className="hud-badges">
              <span className="mini-badge">{selectedConfig.name}</span>
              {selectedDifficulty === "advanced" ? <span className="mini-badge mini-badge--seed">独立种子</span> : null}
            </div>
            <PixelButton className="start-guide-open-button" onClick={() => setIsGuideOpen(true)} variant="secondary" type="button">
              新手说明
            </PixelButton>
          </div>
        </div>

        <section className="town-layout start-town-layout">
          <aside className="town-sidebar start-sidebar">
            <div className="hub-button-grid">
              <button className="hub-button hub-button--trade hub-button--locked" type="button" disabled><strong>市场</strong><span>开局后解锁</span></button>
              <button className="hub-button hub-button--signals hub-button--locked" type="button" disabled><strong>消息</strong><span>开局后解锁</span></button>
              <button className="hub-button hub-button--etfs" type="button"><strong>图鉴</strong><span>认识 ETF</span></button>
              {hasSavedGame && onContinue ? (
                <button className="hub-button hub-button--load" onClick={onContinue} type="button"><strong>存档</strong><span>继续进度</span></button>
              ) : (
                <button className="hub-button hub-button--life" type="button"><strong>生活</strong><span>现金与状态</span></button>
              )}
            </div>
          </aside>

          <section className="town-map start-map">
            <div className="section-title center-title start-map-title">
              <h2>欢迎来到 ETF 小镇</h2>
              <p>先选难度，再开始你的 12 个交易日模拟旅程。</p>
            </div>

            <div className="town-map-scene" aria-hidden="true">
              <span className="town-map-scene__building town-map-scene__building--trade" />
              <span className="town-map-scene__building town-map-scene__building--research" />
              <span className="town-map-scene__building town-map-scene__building--market" />
              <span className="town-map-scene__fountain" />
            </div>

            <div className="town-floating-labels" aria-hidden="true">
              <span className="town-map-label town-map-label--trade">交易中心</span>
              <span className="town-map-label town-map-label--research">投资研究</span>
              <span className="town-map-label town-map-label--build">小镇建设</span>
            </div>

            <div className="town-notice">
              <strong>小镇公告</strong>
              <p>前两个交易日不计时，我会陪你按“读消息 → 开始交易日 → 交易或生活安排 → 收盘复盘”的节奏走一遍。</p>
            </div>
          </section>

          <aside className="town-task-panel start-task-panel">
            <div className="town-task-panel__header">
              <strong>准备开始</strong>
              <span>{selectedConfig.shortName}</span>
            </div>
            <h3>{selectedConfig.name}</h3>
            <p className="start-panel-copy">{selectedConfig.description}</p>
            <div className="start-difficulty-grid" role="group" aria-label="选择难度">
              {(Object.keys(difficultyConfigs) as Difficulty[]).map((difficulty) => (
                <PixelButton
                  key={difficulty}
                  className={selectedDifficulty === difficulty ? "difficulty-button difficulty-button--selected" : "difficulty-button"}
                  onClick={() => onSelectDifficulty(difficulty)}
                  variant={selectedDifficulty === difficulty ? "primary" : "secondary"}
                  type="button"
                  aria-pressed={selectedDifficulty === difficulty}
                >
                  {difficultyConfigs[difficulty].shortName}
                </PixelButton>
              ))}
            </div>

            <p className="start-quick-note">
              每交易日 {selectedConfig.daySeconds} 秒；前两个交易日不计时、不自动结算。回撤超过约 {Math.round(selectedConfig.maxDrawdownLimit * 100)}% 会提前结束。
              {selectedDifficulty === "advanced" ? "进阶模式会生成独立行情种子，读档后行情仍可复现。" : null}
            </p>

            <PixelButton className="start-panel-primary-button" onClick={() => onStart(startSlot)} type="button">
              开始游戏
            </PixelButton>

            <div className="start-panel-section">
              <small>存档</small>
              <div className="start-save-grid">
                {saveSlots.map((slot) => (
                  <PixelButton
                    key={slot.id}
                    className={slot.id === ADVANCED_SEED_SLOT_ID ? "save-slot-button save-slot-button--advanced" : "save-slot-button"}
                    onClick={() => {
                      if (slot.exists) {
                        onLoadSlot(slot.id);
                        return;
                      }
                      if (slot.id === ADVANCED_SEED_SLOT_ID) onSelectDifficulty("advanced");
                      onStart(slot.id);
                    }}
                    variant={slot.exists ? "secondary" : "primary"}
                    type="button"
                    title={slot.exists ? `读取 ${slot.label}` : `在 ${slot.label} 开始新游戏`}
                  >
                    {slot.exists
                      ? slot.id === ADVANCED_SEED_SLOT_ID
                        ? slot.label + " · Day " + (slot.month ?? 1) + " · 种子 " + (slot.marketSeed ?? "旧档")
                        : slot.label + " · Day " + (slot.month ?? 1) + " · " + (slot.difficulty ? difficultyConfigs[slot.difficulty].shortName : "标准")
                      : slot.id === ADVANCED_SEED_SLOT_ID
                        ? slot.label + " · 新进阶局"
                        : slot.label + " · 新游戏"}
                  </PixelButton>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <footer className="town-bottom-bar start-bottom-bar">
          <div className="town-bottom-note">
            <strong>王初一提醒</strong>
            <p>先不用急着猜对错，能说出自己为什么这样做，就已经很好了。</p>
          </div>
          <PixelButton className="start-primary-button" onClick={() => onStart(startSlot)} type="button">
            开始游戏
          </PixelButton>
        </footer>
      </section>

      {isGuideOpen ? (
        <div className="start-guide-modal" role="dialog" aria-modal="true" aria-labelledby="start-guide-title" onClick={closeGuide}>
          <section className="start-guide-dialog" onClick={(event) => event.stopPropagation()}>
            <header className="start-guide-modal__header">
              <div>
                <p className="eyebrow">新手说明</p>
                <h2 id="start-guide-title">先用 1 分钟认识 ETF 小镇</h2>
                <p>看清楚节奏再出发。说明里不计时，也不会推进交易日。</p>
              </div>
              <button className="start-guide-modal__close" onClick={closeGuide} type="button" aria-label="关闭新手说明">
                关闭
              </button>
            </header>

            <div className="guide-modal-list">
              <article className="guide-modal-card">
                <span className="guide-modal-card__number">01</span>
                <div className="guide-modal-card__content">
                  <h3>王初一陪你进门</h3>
                  <p className="guide-modal-card__subtitle">先了解前两个交易日会发生什么</p>
                  <div className="guide-modal-card__body">
                    <PixelAvatar kind="cat" size="small" />
                    <p>前两个交易日，我会陪你按“读消息 → 打开交易日 → 交易或安排生活 → 收盘复盘”的顺序走一遍。这几步不催时间，你可以慢慢看。先别急着猜对错，能说出自己为什么这样做，就已经很好了。</p>
                  </div>
                </div>
              </article>

              <article className="guide-modal-card">
                <span className="guide-modal-card__number">02</span>
                <div className="guide-modal-card__content">
                  <h3>先认识 5 个词</h3>
                  <p className="guide-modal-card__subtitle">现金、资产、仓位、收益、回撤</p>
                  <ul className="guide-term-list">
                    <li><strong>现金：</strong>现在马上就能用的钱。</li>
                    <li><strong>资产：</strong>现金加上持仓按模拟价格折算后的总值。</li>
                    <li><strong>仓位：</strong>持仓占总资产的比例，越高波动通常越明显。</li>
                    <li><strong>收益：</strong>和一开始投入的钱相比，现在多了还是少了。</li>
                    <li><strong>回撤：</strong>资产从阶段高点回落的最大幅度，用来提醒风险。</li>
                  </ul>
                </div>
              </article>

              <article className="guide-modal-card">
                <span className="guide-modal-card__number">03</span>
                <div className="guide-modal-card__content">
                  <h3>每天怎么走一轮</h3>
                  <p className="guide-modal-card__subtitle">消息、交易、结算、复盘</p>
                  <p>先读消息，分清哪些是事实、哪些只是观点；再打开交易日，按自己的目标做交易或生活安排；收盘后看看收益、回撤、挑战和小镇成长。日内价格不会实时跳动，变化通常在结算时统一发生。</p>
                </div>
              </article>

              <article className="guide-modal-card">
                <span className="guide-modal-card__number">04</span>
                <div className="guide-modal-card__content">
                  <h3>每日目标、挑战和小镇成长</h3>
                  <p className="guide-modal-card__subtitle">做得稳，也能把小城建起来</p>
                  <p><strong>每日目标：</strong>读消息、至少完成 1 笔交易、第 2 天起安排 1 次生活行动，并在结算时保留当前难度要求的基础现金。完成目标会得到小镇徽章。</p>
                  <p><strong>每日挑战：</strong>每天还会多一个小任务，比如留住现金、控制交易次数、分散配置或避免追高。它不会改变涨跌，完成后会把成长值记到小镇里。</p>
                  <p><strong>小镇成长：</strong>完成目标 +{selectedConfig.goalPoints}，完成挑战再加成长值，收益和低回撤也有机会加分。累计到 12 / 28 / 48 / 72 / 100 点，会逐步解锁书报亭、生活服务街、投资研究中心、基金花园和中央广场。</p>
                </div>
              </article>

              <article className="guide-modal-card">
                <span className="guide-modal-card__number">05</span>
                <div className="guide-modal-card__content">
                  <h3>存档与读档</h3>
                  <p className="guide-modal-card__subtitle">{savedSlots.length > 0 ? "已有 " + savedSlots.length + " 个进度可继续" : "开始后会在这里留下进度"}</p>
                  <div className="start-actions">
                    {savedSlots.map((slot) => (
                      <PixelButton key={slot.id} onClick={() => onLoadSlot(slot.id)} variant="secondary" type="button">
                        读取{slot.label}
                      </PixelButton>
                    ))}
                  </div>
                  {savedSlots.length > 0 ? (
                    <div className="start-actions start-actions--danger">
                      {savedSlots.map((slot) => (
                        <PixelButton key={slot.id + "-delete"} onClick={() => onDeleteSlot(slot.id)} variant="danger" type="button">
                          删除{slot.label}
                        </PixelButton>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            </div>

            <footer className="start-guide-modal__footer">
              <PixelButton onClick={closeGuide} variant="secondary" type="button">先看看小镇</PixelButton>
              <PixelButton onClick={startNow} type="button">立即开始游戏</PixelButton>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}


