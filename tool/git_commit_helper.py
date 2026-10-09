#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本仓库可视化 Git 提交小工具
双击同目录「启动Git提交工具.bat」即可打开。
仓库根目录 = tool/ 的上一级。
"""

from __future__ import annotations

import os
import subprocess
import sys
import threading
import tkinter as tk
from datetime import datetime
from tkinter import messagebox, scrolledtext, ttk

# 仓库根：tool/ 的上一级
TOOL_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(TOOL_DIR)


def run_cmd(args: list[str], cwd: str = REPO_ROOT, timeout: int = 600) -> tuple[int, str]:
    """在仓库根执行命令，合并 stdout/stderr。"""
    try:
        creationflags = 0
        if sys.platform == "win32":
            creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        p = subprocess.run(
            args,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            creationflags=creationflags,
        )
        out = (p.stdout or "") + (p.stderr or "")
        return p.returncode, out.strip()
    except FileNotFoundError:
        return 127, f"找不到命令：{args[0]}"
    except subprocess.TimeoutExpired:
        return 124, "命令超时"
    except Exception as e:
        return 1, str(e)


def git(*args: str, timeout: int = 120) -> tuple[int, str]:
    return run_cmd(["git", *args], timeout=timeout)


class GitCommitApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Git 可视化提交 · milkywaydev")
        self.geometry("820x640")
        self.minsize(720, 520)
        self.configure(bg="#f4f6f9")

        self._busy = False
        self._build_ui()
        self.refresh_status()

    def _build_ui(self) -> None:
        pad = {"padx": 14, "pady": 6}

        header = tk.Frame(self, bg="#0f172a")
        header.pack(fill="x")
        tk.Label(
            header,
            text="Git 可视化提交",
            font=("Microsoft YaHei UI", 16, "bold"),
            fg="#f8fafc",
            bg="#0f172a",
        ).pack(anchor="w", padx=16, pady=(12, 2))
        self.lbl_meta = tk.Label(
            header,
            text="",
            font=("Microsoft YaHei UI", 9),
            fg="#94a3b8",
            bg="#0f172a",
            justify="left",
        )
        self.lbl_meta.pack(anchor="w", padx=16, pady=(0, 12))

        body = tk.Frame(self, bg="#f4f6f9")
        body.pack(fill="both", expand=True, **pad)

        row = tk.Frame(body, bg="#f4f6f9")
        row.pack(fill="x", pady=(4, 4))
        ttk.Button(row, text="刷新状态", command=self.refresh_status).pack(side="left")
        ttk.Button(row, text="打开仓库目录", command=self.open_repo).pack(side="left", padx=(8, 0))

        tk.Label(
            body,
            text="变更文件",
            font=("Microsoft YaHei UI", 10, "bold"),
            bg="#f4f6f9",
            fg="#0f172a",
        ).pack(anchor="w", pady=(8, 2))

        self.txt_status = scrolledtext.ScrolledText(
            body,
            height=12,
            font=("Consolas", 10),
            bg="#0b1220",
            fg="#e2e8f0",
            insertbackground="#e2e8f0",
            relief="flat",
            wrap="none",
        )
        self.txt_status.pack(fill="both", expand=True)

        tk.Label(
            body,
            text="提交说明",
            font=("Microsoft YaHei UI", 10, "bold"),
            bg="#f4f6f9",
            fg="#0f172a",
        ).pack(anchor="w", pady=(10, 2))

        self.ent_msg = tk.Text(
            body,
            height=3,
            font=("Microsoft YaHei UI", 11),
            relief="solid",
            bd=1,
            wrap="word",
        )
        self.ent_msg.pack(fill="x")
        self.ent_msg.insert("1.0", self._default_message())

        opts = tk.Frame(body, bg="#f4f6f9")
        opts.pack(fill="x", pady=(8, 4))
        self.var_deploy = tk.BooleanVar(value=False)
        self.var_push = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            opts,
            text="提交前先 npm run deploy（更新 docs/，上线网页需要勾选）",
            variable=self.var_deploy,
        ).pack(anchor="w")
        ttk.Checkbutton(
            opts,
            text="提交后 git push 到远端",
            variable=self.var_push,
        ).pack(anchor="w", pady=(4, 0))

        actions = tk.Frame(body, bg="#f4f6f9")
        actions.pack(fill="x", pady=(10, 4))
        self.btn_run = ttk.Button(
            actions,
            text="一键提交",
            command=self.on_commit,
        )
        self.btn_run.pack(side="left")
        ttk.Button(actions, text="仅暂存全部 (git add -A)", command=self.on_stage_only).pack(
            side="left", padx=(8, 0)
        )

        self.lbl_log = tk.Label(
            body,
            text="就绪",
            font=("Microsoft YaHei UI", 9),
            bg="#f4f6f9",
            fg="#475569",
            anchor="w",
            justify="left",
        )
        self.lbl_log.pack(fill="x", pady=(8, 0))

    def _default_message(self) -> str:
        stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        return f"更新站点内容（{stamp}）"

    def set_busy(self, busy: bool, tip: str = "") -> None:
        self._busy = busy
        state = "disabled" if busy else "normal"
        self.btn_run.configure(state=state)
        if tip:
            self.lbl_log.configure(text=tip)

    def open_repo(self) -> None:
        if sys.platform == "win32":
            os.startfile(REPO_ROOT)  # type: ignore[attr-defined]
        else:
            subprocess.Popen(["xdg-open", REPO_ROOT])

    def refresh_status(self) -> None:
        code_b, branch = git("rev-parse", "--abbrev-ref", "HEAD")
        code_s, short = git("status", "-sb")
        code_d, diff = git("status", "--short")

        branch_name = branch if code_b == 0 else "?"
        ahead = ""
        if code_s == 0 and "ahead" in short:
            ahead = " · " + short.split("...")[-1] if "..." in short else ""

        self.lbl_meta.configure(
            text=f"仓库：{REPO_ROOT}\n分支：{branch_name}{ahead}"
        )

        self.txt_status.configure(state="normal")
        self.txt_status.delete("1.0", "end")
        if code_d != 0:
            self.txt_status.insert("end", diff or "无法读取 git status")
        elif not diff.strip():
            self.txt_status.insert("end", "（工作区干净，没有待提交改动）")
        else:
            self.txt_status.insert("end", diff)
        self.txt_status.configure(state="disabled")
        self.lbl_log.configure(text="状态已刷新")

    def on_stage_only(self) -> None:
        if self._busy:
            return
        code, out = git("add", "-A")
        self.refresh_status()
        if code == 0:
            messagebox.showinfo("完成", "已暂存全部改动（git add -A）")
        else:
            messagebox.showerror("失败", out or "git add 失败")

    def on_commit(self) -> None:
        if self._busy:
            return
        msg = self.ent_msg.get("1.0", "end").strip()
        if not msg:
            messagebox.showwarning("提示", "请先填写提交说明")
            return

        do_deploy = self.var_deploy.get()
        do_push = self.var_push.get()

        tip = "将执行：\n"
        if do_deploy:
            tip += "1) npm run deploy\n2) git add -A\n3) git commit\n"
        else:
            tip += "1) git add -A\n2) git commit\n"
        if do_push:
            tip += "然后 git push\n"
        tip += "\n确认继续？"
        if not messagebox.askyesno("确认提交", tip):
            return

        threading.Thread(
            target=self._commit_worker,
            args=(msg, do_deploy, do_push),
            daemon=True,
        ).start()

    def _commit_worker(self, msg: str, do_deploy: bool, do_push: bool) -> None:
        self.after(0, lambda: self.set_busy(True, "处理中…"))

        logs: list[str] = []

        def step(label: str, args: list[str], timeout: int = 600) -> bool:
            self.after(0, lambda: self.lbl_log.configure(text=f"正在：{label}"))
            code, out = run_cmd(args, timeout=timeout)
            if out:
                logs.append(f"[{label}]\n{out}")
            if code != 0:
                logs.append(f"[{label}] 退出码 {code}")
                return False
            return True

        try:
            if do_deploy:
                # Windows 下优先 npm.cmd
                npm = "npm.cmd" if sys.platform == "win32" else "npm"
                if not step("npm run deploy", [npm, "run", "deploy"], timeout=900):
                    self.after(
                        0,
                        lambda: messagebox.showerror(
                            "deploy 失败", "\n\n".join(logs[-2:]) or "npm run deploy 失败"
                        ),
                    )
                    return

            if not step("git add -A", ["git", "add", "-A"]):
                self.after(0, lambda: messagebox.showerror("失败", "\n\n".join(logs[-2:])))
                return

            code, st = git("status", "--porcelain")
            if code == 0 and not st.strip():
                self.after(
                    0,
                    lambda: messagebox.showinfo("无需提交", "没有可提交的改动（工作区干净）"),
                )
                return

            # 用 -m 传消息，避免交互式编辑器
            if not step("git commit", ["git", "commit", "-m", msg]):
                self.after(0, lambda: messagebox.showerror("提交失败", "\n\n".join(logs[-2:])))
                return

            if do_push:
                if not step("git push", ["git", "push"], timeout=180):
                    self.after(
                        0,
                        lambda: messagebox.showerror(
                            "推送失败",
                            "提交可能已成功，但 push 失败：\n\n" + ("\n\n".join(logs[-2:])),
                        ),
                    )
                    return

            summary = "提交成功" + ("，并已 push" if do_push else "（未 push）")
            if do_deploy:
                summary += "\n已执行 npm run deploy"
            self.after(0, lambda: messagebox.showinfo("完成", summary))
        finally:
            self.after(0, self.refresh_status)
            self.after(0, lambda: self.set_busy(False, "就绪"))


def main() -> None:
    if not os.path.isdir(os.path.join(REPO_ROOT, ".git")):
        # 允许未检测到 .git 时仍打开，但给出提示
        root = tk.Tk()
        root.withdraw()
        messagebox.showwarning(
            "提示",
            f"未在上级目录检测到 .git：\n{REPO_ROOT}\n\n仍将尝试以该目录作为仓库根。",
        )
        root.destroy()

    app = GitCommitApp()
    app.mainloop()


if __name__ == "__main__":
    main()
