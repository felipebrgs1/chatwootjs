export const STYLES = `
:host { all: initial; }
.cw-launcher {
  position: fixed; z-index: 2147483000; bottom: 24px;
  width: 60px; height: 60px; border-radius: 50%;
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
  font-size: 26px; color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.cw-launcher.right { right: 24px; }
.cw-launcher.left { left: 24px; }
.cw-badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 22px; height: 22px; border-radius: 11px;
  background: #ef4444; color: #fff; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; padding: 0 5px;
}
.cw-panel {
  position: fixed; z-index: 2147483000; bottom: 100px;
  width: 380px; max-width: calc(100vw - 32px); height: 560px; max-height: calc(100vh - 140px);
  background: #fff; border-radius: 16px; overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,.25);
  display: flex; flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px; color: #1f2937;
}
.cw-panel.right { right: 24px; }
.cw-panel.left { left: 24px; }
.cw-header { padding: 16px; color: #fff; }
.cw-header h2 { margin: 0 0 2px; font-size: 17px; }
.cw-header p { margin: 0; font-size: 13px; opacity: .9; }
.cw-body { flex: 1; overflow-y: auto; padding: 12px; background: #f3f4f6; }
.cw-msg { max-width: 80%; margin: 4px 0; padding: 8px 12px; border-radius: 14px; line-height: 1.4; word-break: break-word; }
.cw-msg.agent { background: #fff; align-self: flex-start; border-top-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.cw-msg.user { background: var(--cw-color, #1f93ff); color: #fff; align-self: flex-end; border-top-right-radius: 4px; margin-left: auto; }
.cw-msg .cw-meta { display: block; font-size: 10px; opacity: .65; margin-top: 2px; }
.cw-thread { display: flex; flex-direction: column; }
.cw-form { display: flex; flex-direction: column; gap: 8px; padding: 4px; }
.cw-form input, .cw-form textarea {
  width: 100%; box-sizing: border-box; padding: 10px 12px;
  border: 1px solid #d1d5db; border-radius: 10px; font-size: 14px; font-family: inherit;
}
.cw-form input:focus, .cw-form textarea:focus { outline: none; border-color: var(--cw-color, #1f93ff); }
.cw-btn {
  border: none; border-radius: 10px; padding: 11px; font-size: 14px; font-weight: 600;
  color: #fff; background: var(--cw-color, #1f93ff); cursor: pointer;
}
.cw-btn:disabled { opacity: .6; cursor: default; }
.cw-composer { display: flex; gap: 8px; padding: 10px; background: #fff; border-top: 1px solid #e5e7eb; }
.cw-composer input {
  flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 20px; font-size: 14px; font-family: inherit;
}
.cw-composer input:focus { outline: none; border-color: var(--cw-color, #1f93ff); }
.cw-send {
  width: 40px; height: 40px; border-radius: 50%; border: none; cursor: pointer;
  background: var(--cw-color, #1f93ff); color: #fff; font-size: 16px; flex-shrink: 0;
}
.cw-error { color: #b91c1c; font-size: 12px; padding: 4px; }
.cw-csat { display: flex; flex-direction: column; gap: 8px; align-items: center; padding: 16px 8px; }
.cw-stars { display: flex; gap: 6px; font-size: 30px; }
.cw-stars button { background: none; border: none; cursor: pointer; font-size: 30px; padding: 0 2px; filter: grayscale(1); opacity: .5; }
.cw-stars button.on { filter: none; opacity: 1; }
.cw-home { display: flex; flex-direction: column; gap: 10px; padding: 8px 4px; }
.cw-ooo { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 10px; padding: 10px 12px; font-size: 13px; }
@media (max-width: 480px) {
  .cw-panel { width: calc(100vw - 24px); right: 12px !important; left: 12px !important; }
}
`;
