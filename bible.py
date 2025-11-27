import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox
import random
import re
import sys
import os
import json
import shutil
from pathlib import Path

# --- Configuration & Constants ---
ctk.set_appearance_mode("System")
ctk.set_default_color_theme("blue")

PUNCT_RE = re.compile(r'[,\-]')
WORD_TOKEN_RE = re.compile(r'[0-9A-Za-z가-힣]')

def resource_path(rel: str) -> str:
    base = getattr(sys, "_MEIPASS", Path(__file__).parent)
    return str(Path(base, rel))

def norm_token(s: str) -> str:
    return PUNCT_RE.sub('', s).strip()

def mask_len_keep_punct(tok: str) -> str:
    return re.sub(r'[0-9A-Za-z가-힣]+', lambda m: '_' * len(m.group(0)), tok)

def mask_one_keep_punct(tok: str) -> str:
    return re.sub(r'[0-9A-Za-z가-힣]+', '_', tok)

def parse_ref_parts(ref: str):
    s = ref.strip()
    if s.startswith('(') and s.endswith(')'):
        s = s[1:-1]
    
    # Try splitting by last space first (standard format: Book Chap:Verse)
    parts = s.rsplit(None, 1)
    if len(parts) == 2:
        book, chap_verse = parts
    else:
        # Fallback: try to find where the number starts
        m = re.search(r'\d', s)
        if m:
            idx = m.start()
            book = s[:idx].strip()
            chap_verse = s[idx:].strip()
        else:
            # No numbers found, treat whole as book
            return s, "0", "0"

    if ':' in chap_verse:
        chap, verse = chap_verse.split(':', 1)
    else:
        chap, verse = chap_verse, "0"
        
    return book, chap, verse

def split_verse_parts(verse: str):
    if '-' in verse:
        a, b = verse.split('-', 1)
        return '_-_', [a, b]
    if ',' in verse:
        parts = [p.strip() for p in verse.split(',') if p.strip()]
        mask = ','.join(['_'] * len(parts))
        return mask, parts
    return '_', [verse]

def ref_masked(ref: str, masked: bool) -> str:
    book, chap, verse = parse_ref_parts(ref)
    if not masked:
        return f"({book} {chap}:{verse})"
    verse_mask, _ = split_verse_parts(verse)
    return f"(_ _:{verse_mask})"

class ConfigManager:
    def __init__(self, filename="settings.json"):
        self.filename = filename
        self.default_config = {
            "theme": "System",
            "font_size": 24,
            "last_day_index": 0,
            "custom_data_paths": []
        }
        
    @property
    def filepath(self):
        if getattr(sys, 'frozen', False):
            base_dir = os.path.dirname(sys.executable)
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
        return os.path.join(base_dir, self.filename)

    def load(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    return {**self.default_config, **json.load(f)}
            except:
                return self.default_config
        return self.default_config

    def save(self, config):
        try:
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=4)
        except:
            pass

class BibleApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        # Config
        self.config_manager = ConfigManager()
        self.config_data = self.config_manager.load()

        # Window Setup
        self.title("말씀 암송 프로그램")
        self.geometry("1200x800")
        self.minsize(800, 600)
        
        # Theme Setup
        ctk.set_appearance_mode(self.config_data["theme"])
        
        # Icon
        try:
            if sys.platform == "win32":
                ico = resource_path("samuel_icon.ico")
                if Path(ico).exists():
                    self.iconbitmap(ico)
        except Exception:
            pass

        # Data State
        self.original_scriptures = []
        self.original_filenames = []
        self.scripture = []
        self.wrong_verses = []
        
        self.day_num = 0
        self.left_verse = 0
        self.left_verse = 0
        self.fail_num = 0
        self.score = 0
        
        self.current_mode = 1
        self.blank_num = 5
        self.whole_level_num = 1
        
        self.current_problem = ""
        self.current_answers = []
        self.current_reference = ""
        self.problem_num = 0
        self.attempts = 0
        self.problem_completed = False
        self.hint_count = 0

        # Font State
        self.font_family = "맑은 고딕"
        self.font_size = self.config_data["font_size"]

        # Load Data
        self.load_data()

        # UI Setup
        self.create_menu()
        self.create_widgets()
        
        # Restore last session
        last_idx = self.config_data.get("last_day_index", 0)
        if 0 <= last_idx < len(self.original_filenames):
            self.select_day(last_idx)
            
        # Bind close event
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

    def load_data(self):
        bundled_data_dir = resource_path("data")
        if getattr(sys, 'frozen', False):
            local_data_dir = os.path.join(os.path.dirname(sys.executable), "data")
        else:
            local_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

        target_files = {}
        
        def scan_dir(d):
            if os.path.exists(d):
                for f in os.listdir(d):
                    if f.lower().endswith(".txt"):
                        target_files[f] = os.path.join(d, f)

        scan_dir(bundled_data_dir)
        scan_dir(local_data_dir)
        
        # Scan Custom Paths
        for path in self.config_data.get("custom_data_paths", []):
            scan_dir(path)
        
        # Ensure day1.txt exists
        if "day1.txt" not in target_files:
            if not os.path.exists(local_data_dir):
                os.makedirs(local_data_dir)
            day1_path = os.path.join(local_data_dir, "day1.txt")
            try:
                with open(day1_path, "w", encoding="utf-8") as f:
                    sample_data = """1\(요 5:39)^너희가 성경에서 영생을 얻는줄 생각하고 성경을 상고하거니와 이 성경이 곧 내게 대하여 증거하는 것이로다
1\(롬 10:17)^그러므로 믿음은 들음에서 나며 들음은 그리스도의 말씀으로 말미암았느니라
1\(사 34:16)^너희는 여호와의 책을 자세히 읽어보라 이것들이 하나도 빠진 것이 없고 하나도 그 짝이 없는 것이 없으리니 이는 여호와의 입이 이를 명하셨고 그의 신이 이것들을 모으셨음이라
1\(딤후 3:16-17)^모든 성경은 하나님의 감동으로 된 것으로 교훈과 책망과 바르게 함과 의로 교육하기에 유익하니 이는 하나님의 사람으로 온전케 하며 모든 선한 일을 행하기에 온전케 하려 함이니라
1\(벧후 1:20-21)^먼저 알 것은 경의 모든 예언은 사사로이 풀 것이 아니니 예언은 언제든지 사람의 뜻으로 낸 것이 아니요 오직 성령의 감동하심을 입은 사람들이 하나님께 받아 말한 것임이니라
1\(딤전 6:16)^오직 그에게만 죽지 아니함이 있고 가까이 가지 못할 빛에 거하시고 아무 사람도 보지 못하였고 또 볼 수 없는 자시니 그에게 존귀와 영원한 능력을 돌릴찌어다 아멘
1\(히 3:4)^집마다 지은 이가 있으니 만물을 지으신 이는 하나님이시라
1\(롬 1:20)^창세로부터 그의 보이지 아니하는 것들 곧 그의 영원하신 능력과 신성이 그 만드신 만물에 분명히 보여 알게 되나니 그러므로 저희가 핑계치 못할찌니라
1\(욥 38:31)^네가 묘성을 매어 떨기 되게 하겠느냐 삼성의 띠를 풀겠느냐
1\(욥 26:7)^그는 북편 하늘을 허공에 펴시며 땅을 공간에 다시며
2\(레 11:6)^토끼도 새김질은 하되 굽이 갈라지지 아니하였으므로 너희에게 부정하고
2\(욥 39:26)^매가 떠올라서 날개를 펼쳐 남방으로 향하는 것이 어찌 네 지혜로 말미암음이냐
1\(살전 5:23)^평강의 하나님이 친히 너희로 온전히 거룩하게 하시고 또 너희 온 영과 혼과 몸이 우리 주 예수 그리스도 강림하실 때에 흠없게 보전되기를 원하노라
1\(롬 1:19)^이는 하나님을 알만한 것이 저희 속에 보임이라 하나님께서 이를 저희에게 보이셨느니라
1\(롬 2:15)^이런 이들은 그 양심이 증거가 되어 그 생각들이 서로 혹은 송사하며 혹은 변명하여 그 마음에 새긴 율법의 행위를 나타내느니라
1\(전 3:11)^하나님이 모든 것을 지으시되 때를 따라 아름답게 하셨고 또 사람에게 영원을 사모하는 마음을 주셨느니라 그러나 하나님의 하시는 일의 시종을 사람으로 측량할 수 없게 하셨도다
1\(욥 19:26)^나의 이 가죽, 이것이 썩은 후에 내가 육체 밖에서 하나님을 보리라
2\(창 1:27)^하나님이 자기 형상 곧 하나님의 형상대로 사람을 창조하시되 남자와 여자를 창조하시고
3\(출 33:20)^또 가라사대 네가 내 얼굴을 보지 못하리니 나를 보고 살 자가 없음이니라
3\(욥 36:27-28)^그가 물을 가늘게 이끌어 올리신즉 그것이 안개 되어 비를 이루고 그것이 공중에서 내려 사람 위에 쏟아지느니라
3\(욥 36:30-31)^그가 번개 빛으로 자기의 사면에 두르시며 바다 밑도 가리우시며 이런 것들로 만민을 징벌하시며 이런 것들로 식물을 풍비히 주시느니라
4\(사 45:18)^여호와는 하늘을 창조하신 하나님이시며 땅도 조성하시고 견고케 하시되 헛되이 창조치 아니하시고 사람으로 거하게 지으신 자시니라 그 말씀에 나는 여호와라 나 외에 다른 이가 없느니라
4\(사 40:26)^너희는 눈을 높이 들어 누가 이 모든 것을 창조하였나 보라 주께서는 수효대로 만상을 이끌어 내시고 각각 그 이름을 부르시나니 그의 권세가 크고 그의 능력이 강하므로 하나도 빠짐이 없느니라
4\(전 12:7)^흙은 여전히 땅으로 돌아가고 신은 그 주신 하나님께로 돌아가기 전에 기억하라"""
                    f.write(sample_data)
                target_files["day1.txt"] = day1_path
            except:
                pass

        self.original_scriptures = []
        self.original_filenames = []
        
        sorted_files = sorted(target_files.keys())
        for fname in sorted_files:
            p = target_files[fname]
            try:
                with open(p, "r", encoding="utf-8") as f:
                    lines = [line.strip() for line in f.readlines() if line.strip()]
                self.original_scriptures.append(lines)
                self.original_filenames.append(fname)
            except:
                pass

    def create_menu(self):
        menubar = tk.Menu(self)
        
        # Management Menu
        manage_menu = tk.Menu(menubar, tearoff=0)
        
        manage_menu.add_command(label="일차 추가", command=self.open_add_day_popup)
        manage_menu.add_command(label="일차 삭제", command=self.delete_file_popup)
        manage_menu.add_command(label="구절 추가", command=self.open_add_verse_popup)
        manage_menu.add_command(label="구절 수정", command=self.open_edit_verse_popup)
        manage_menu.add_command(label="구절 삭제", command=self.delete_verse_popup)
        manage_menu.add_separator()
        manage_menu.add_command(label="파일 내보내기", command=self.export_file_popup)
        manage_menu.add_command(label="파일 가져오기", command=self.import_file_popup)
        menubar.add_cascade(label="관리", menu=manage_menu)
        
        # View Menu (Theme)
        view_menu = tk.Menu(menubar, tearoff=0)
        view_menu.add_command(label="Light 모드", command=lambda: self.set_theme("Light"))
        view_menu.add_command(label="Dark 모드", command=lambda: self.set_theme("Dark"))
        menubar.add_cascade(label="보기", menu=view_menu)

        self.config(menu=menubar)
        self.refresh_day_menu()

    def refresh_day_menu(self):
        # Update ComboBox if exists
        if hasattr(self, 'day_combo'):
            self.day_combo.configure(values=[f.replace(".txt", "") for f in self.original_filenames])

    def register_data_folder(self):
        from tkinter import filedialog
        folder_path = filedialog.askdirectory(title="데이터 폴더 선택")
        if not folder_path:
            return
            
        # Normalize path
        folder_path = os.path.normpath(folder_path)
        
        # Check if already registered
        current_paths = self.config_data.get("custom_data_paths", [])
        if folder_path in current_paths:
            messagebox.showinfo("알림", "이미 등록된 폴더입니다.")
            return
            
        # Add to config
        current_paths.append(folder_path)
        self.config_data["custom_data_paths"] = current_paths
        self.config_manager.save(self.config_data)
        
        # Reload data
        self.load_data()
        self.refresh_day_menu()
        messagebox.showinfo("성공", f"폴더가 등록되었습니다.\n{folder_path}")

    def export_file_popup(self):
        if not self.original_filenames:
            messagebox.showinfo("알림", "내보낼 파일이 없습니다.")
            return
            
        win = ctk.CTkToplevel(self)
        win.title("파일 내보내기")
        win.geometry("300x150")
        win.grab_set()

        ctk.CTkLabel(win, text="내보낼 파일 선택").pack(pady=10)
        file_var = ctk.StringVar(value=self.original_filenames[0])
        file_cb = ctk.CTkComboBox(win, values=self.original_filenames, variable=file_var)
        file_cb.pack(pady=5)

        def export():
            fname = file_var.get()
            
            # Find source path
            src_path = ""
            bundled_data_dir = resource_path("data")
            if getattr(sys, 'frozen', False):
                local_data_dir = os.path.join(os.path.dirname(sys.executable), "data")
            else:
                local_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

            # Check local first, then bundled, then custom
            possible_dirs = [local_data_dir, bundled_data_dir] + self.config_data.get("custom_data_paths", [])
            
            for d in possible_dirs:
                p = os.path.join(d, fname)
                if os.path.exists(p):
                    src_path = p
                    break
            
            if not src_path:
                messagebox.showerror("오류", "원본 파일을 찾을 수 없습니다.")
                return

            from tkinter import filedialog
            dest_path = filedialog.asksaveasfilename(
                defaultextension=".txt",
                filetypes=[("Text files", "*.txt")],
                initialfile=fname,
                title="다른 이름으로 저장"
            )
            
            if dest_path:
                try:
                    shutil.copy2(src_path, dest_path)
                    messagebox.showinfo("성공", f"파일이 내보내졌습니다.\n{dest_path}")
                    win.destroy()
                except Exception as e:
                    messagebox.showerror("오류", str(e))

        ctk.CTkButton(win, text="내보내기", command=export).pack(pady=20)

    def import_file_popup(self):
        from tkinter import filedialog
        src_path = filedialog.askopenfilename(
            filetypes=[("Text files", "*.txt")],
            title="가져올 파일 선택"
        )
        
        if not src_path:
            return
            
        fname = os.path.basename(src_path)
        
        if getattr(sys, 'frozen', False):
            local_data_dir = os.path.join(os.path.dirname(sys.executable), "data")
        else:
            local_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
            
        if not os.path.exists(local_data_dir):
            os.makedirs(local_data_dir)
            
        dest_path = os.path.join(local_data_dir, fname)
        
        if os.path.exists(dest_path):
            if not messagebox.askyesno("확인", f"'{fname}' 파일이 이미 존재합니다. 덮어쓰시겠습니까?"):
                return
        
        try:
            shutil.copy2(src_path, dest_path)
            messagebox.showinfo("성공", "파일을 가져왔습니다.")
            self.load_data()
            self.refresh_day_menu()
        except Exception as e:
            messagebox.showerror("오류", str(e))

    def create_widgets(self):
        # Use pack layout for main window
        
        # Top Frame
        self.top_frame = ctk.CTkFrame(self)
        self.top_frame.pack(side="top", fill="x", padx=20, pady=(20, 10))
        
        # Day Selection ComboBox
        self.day_var = ctk.StringVar(value="")
        self.day_combo = ctk.CTkComboBox(
            self.top_frame, 
            variable=self.day_var,
            values=[f.replace(".txt", "") for f in self.original_filenames],
            command=self.on_day_combo_change,
            width=200,
            font=(self.font_family, 16)
        )
        self.day_combo.pack(side="left", padx=(0, 10))

        # Level Selection ComboBox
        self.level_var = ctk.StringVar(value="전체")
        self.level_combo = ctk.CTkComboBox(
            self.top_frame,
            variable=self.level_var,
            values=["전체", "1과정", "2과정", "3과정", "4과정"],
            command=self.on_level_combo_change,
            width=100,
            font=(self.font_family, 16)
        )
        self.level_combo.pack(side="left", padx=(0, 20))

        # Mode Buttons
        modes = [("빈칸", self.open_blank_level), ("구절", lambda: self.set_mode(2)), 
                 ("장절", lambda: self.set_mode(3)), ("전체", self.open_whole_level)]
        
        for text, cmd in modes:
            ctk.CTkButton(self.top_frame, text=text, command=cmd, width=80, height=35).pack(side="left", padx=5)

        # Font Controls
        ctk.CTkButton(self.top_frame, text="가+", command=self.increase_font, width=40, height=35).pack(side="right", padx=5)
        ctk.CTkButton(self.top_frame, text="가-", command=self.decrease_font, width=40, height=35).pack(side="right", padx=5)

        # Problem Area
        self.problem_frame = ctk.CTkFrame(self)
        self.problem_frame.pack(side="top", fill="both", expand=True, padx=20, pady=10)
        self.problem_frame.grid_columnconfigure(0, weight=1)
        self.problem_frame.grid_rowconfigure(0, weight=1)

        self.problem_text = ctk.CTkTextbox(
            self.problem_frame,
            font=(self.font_family, self.font_size),
            wrap="word",
            state="disabled"
        )
        self.problem_text.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)
        
        self.problem_text.tag_config("correct", foreground="green")
        self.problem_text.tag_config("wrong", foreground="red")
        self.problem_text.tag_config("hint", foreground="#F1C40F")

        # Answer Area
        self.answer_entry = ctk.CTkEntry(
            self,
            placeholder_text="정답을 입력하세요...",
            font=(self.font_family, self.font_size),
            height=50
        )
        self.answer_entry.pack(side="top", fill="x", padx=20, pady=10)
        self.answer_entry.bind("<Return>", lambda e: self.submit_answer())
        self.answer_entry.bind("<space>", self.on_space_key)

        # Bottom Frame
        self.bottom_frame = ctk.CTkFrame(self)
        self.bottom_frame.pack(side="bottom", fill="x", padx=20, pady=(0, 20))
        
        self.status_label = ctk.CTkLabel(self.bottom_frame, text="남은 구절: 0 | 틀린 갯수: 0 | 점수: 0", font=("맑은 고딕", 16))
        self.status_label.pack(side="left", padx=20, pady=10)
        
        ctk.CTkButton(self.bottom_frame, text="초기화", command=self.day_reset, fg_color="#C0392B", hover_color="#E74C3C").pack(side="left", padx=10)
        ctk.CTkButton(self.bottom_frame, text="💡 힌트", command=self.show_hint, fg_color="#F1C40F", hover_color="#F39C12", text_color="#2C3E50").pack(side="left", padx=10)
        ctk.CTkButton(self.bottom_frame, text="스킵", command=self.skip_problem, fg_color="#F39C12", hover_color="#F1C40F").pack(side="left", padx=10)
        ctk.CTkButton(self.bottom_frame, text="틀린 구절", command=self.show_wrong_verses).pack(side="right", padx=20)

    def on_day_combo_change(self, choice):
        full_name = choice + ".txt"
        if full_name in self.original_filenames:
            idx = self.original_filenames.index(full_name)
            self.select_day(idx)

    def on_level_combo_change(self, choice):
        self.day_reset()

    def select_day(self, index):
        if 0 <= index < len(self.original_scriptures):
            self.day_num = index + 1
            # self.scripture is set in day_reset now
            
            # Sync ComboBox
            if hasattr(self, 'day_combo') and index < len(self.original_filenames):
                current_name = self.original_filenames[index].replace(".txt", "")
                self.day_combo.set(current_name)
                
            self.day_reset()

    def update_status(self):
        self.status_label.configure(text=f"남은 구절: {self.left_verse} | 틀린 갯수: {self.fail_num} | 점수: {self.score}")

    def day_reset(self):
        if self.day_num > 0:
            idx = self.day_num - 1
            if idx < len(self.original_scriptures):
                raw_verses = self.original_scriptures[idx]
                level_choice = self.level_var.get()
                
                if level_choice == "전체":
                    self.scripture = list(raw_verses)
                else:
                    # Extract level number (e.g., "1과정" -> "1")
                    target_level_str = level_choice.replace("과정", "")
                    try:
                        target_level = int(target_level_str)
                    except ValueError:
                        target_level = 4 # Default to max if error

                    self.scripture = []
                    for v in raw_verses:
                        # Check if v starts with a number <= target_level
                        # v format: "1\(..."
                        m = re.match(r'^(\d+)\\', v)
                        if m:
                            level = int(m.group(1))
                            if level <= target_level:
                                self.scripture.append(v)
                
                self.left_verse = len(self.scripture)
        else:
            self.scripture = []
            self.left_verse = 0
            
        self.fail_num = 0
        self.wrong_verses = []
        self.score = 0
        self.update_status()
        self.display_problem()

    def set_mode(self, mode):
        self.current_mode = mode
        self.display_problem()

    def display_problem(self):
        self.hint_count = 0 # Reset hint count immediately
        
        if not self.scripture:
            self.problem_text.configure(state="normal")
            self.problem_text.delete("1.0", "end")
            self.problem_text.insert("end", "선택된 구절이 없거나 모든 구절을 완료했습니다.")
            self.problem_text.configure(state="disabled")
            return

        self.problem_num = random.randint(0, len(self.scripture)-1)
        text, answers, ref = self.create_blank_problem(self.scripture[self.problem_num], self.current_mode)
        
        self.current_problem = text
        self.current_answers = answers
        self.current_reference = ref
        self.attempts = 0
        self.problem_completed = False
        # self.hint_count = 0 # Removed from here
        
        self.problem_text.configure(state="normal")
        self.problem_text.delete("1.0", "end")
        self.problem_text.insert("end", self.current_problem)
        self.problem_text.configure(state="disabled")
        
        self.answer_entry.delete(0, "end")
        self.answer_entry.focus_set()

    def create_blank_problem(self, scripture_line, mode):
        # Handle Level prefix: "1\(Ref)^Text"
        clean_line = re.sub(r'^\d+\\', '', scripture_line)
        
        reference, verse = clean_line.split('^')
        words = verse.split()
        
        if mode == 1: # Blank Mode
            num_words = len(words)
            num_blanks = int(num_words * max(self.blank_num, 0) * 0.1)
            num_blanks = max(0, min(num_blanks, num_words))
            maskable_idx = [i for i, w in enumerate(words) if WORD_TOKEN_RE.search(w)]
            num_blanks = min(num_blanks, len(maskable_idx))
            blank_indices = sorted(random.sample(maskable_idx, num_blanks)) if num_blanks else []

            answers = [norm_token(words[i]) for i in blank_indices]
            problem_words = [(mask_len_keep_punct(w) if i in blank_indices else w) for i, w in enumerate(words)]
            
            ref_view = ref_masked(reference, masked=False)
            return ref_view + " " + " ".join(problem_words), answers, reference

        elif mode == 2: # Verse Mode
            answers = [norm_token(w) for w in words if WORD_TOKEN_RE.search(w)]
            problem_words = [(mask_one_keep_punct(w) if WORD_TOKEN_RE.search(w) else w) for w in words]
            ref_view = ref_masked(reference, masked=False)
            return ref_view + " " + " ".join(problem_words), answers, reference

        elif mode == 3: # Reference Mode
            book, chap, verse_part = parse_ref_parts(reference)
            _, verse_parts = split_verse_parts(verse_part)
            ref_view = ref_masked(reference, masked=True)
            answers = [book, chap] + verse_parts
            return ref_view + " " + " ".join(words), answers, reference

        elif mode == 4: # Whole Mode
            n = min(self.whole_level_num, len(words))
            rand_index = random.randint(0, len(words) - n)
            visible_words = words[rand_index:rand_index + n]
            
            problem_words = []
            i = 0
            first_occurrence = True
            while i < len(words):
                if first_occurrence and i <= len(words) - n and words[i:i+n] == visible_words:
                    problem_words.extend(visible_words)
                    first_occurrence = False
                    i += n
                else:
                    problem_words.append(mask_one_keep_punct(words[i]))
                    i += 1
            
            ref_view = ref_masked(reference, masked=True)
            book, chap, verse_part = parse_ref_parts(reference)
            _, verse_parts = split_verse_parts(verse_part)
            answers = [book, chap] + verse_parts
            
            i = 0
            skipped_once = False
            while i < len(words):
                if (not skipped_once) and i <= len(words) - n and words[i:i+n] == visible_words:
                    skipped_once = True
                    i += n
                    continue
                w = words[i]
                if WORD_TOKEN_RE.search(w):
                    answers.append(norm_token(w))
                i += 1
                
            return ref_view + " " + " ".join(problem_words), answers, reference
            
        return "", [], ""

    def submit_answer(self):
        user_answer = self.answer_entry.get().strip()
        
        if not self.scripture or not self.current_answers:
            return

        if self.problem_completed:
            self.next_problem()
            return

        if norm_token(user_answer) == norm_token(self.current_answers[0]):
            self.replace_blank_with_answer(self.current_answers[0], True)
            self.current_answers.pop(0)
            self.score += 10
            self.update_status()
            self.answer_entry.delete(0, "end")
            self.attempts = 0
            self.hint_count = 0 # Reset hint count for next blank
            if not self.current_answers:
                self.problem_completed = True
                self.after(500, self.next_problem)
        else:
            self.attempts += 1
            self.answer_entry.delete(0, "end")
            if self.attempts >= 3:
                self.handle_wrong_answer()
            else:
                self.score -= 1
                self.update_status()

    def handle_wrong_answer(self):
        wrong_verse = {
            'reference': self.current_reference,
            'verse': self.scripture[self.problem_num].split('^')[1],
            'full_text': self.scripture[self.problem_num]
        }
        if not any(w['full_text'] == wrong_verse['full_text'] for w in self.wrong_verses):
            self.wrong_verses.append(wrong_verse)
        
        self.replace_blank_with_answer(self.current_answers[0], False)
        self.current_answers.pop(0)
        self.fail_num += 1
        self.score -= 5
        self.update_status()
        self.attempts = 0
        if not self.current_answers:
            self.problem_completed = True
            self.after(500, self.next_problem)

    def replace_blank_with_answer(self, answer, correct):
        # Find first underscore in current problem
        match = re.search(r'_+', self.current_problem)
        if not match:
            return
        
        test_index = match.start()
        
        # Find the start of the blank (might have hint text before underscores)
        # Look backwards from the underscore to find any non-whitespace characters
        # that might be part of a hint
        blank_start = test_index
        for i in range(test_index - 1, -1, -1):
            char = self.current_problem[i]
            if char.isspace() or char in '()^':
                blank_start = i + 1
                break
            # Check if this character could be part of a hint (alphanumeric or Korean)
            if not (char.isalnum() or '\uac00' <= char <= '\ud7a3'):
                blank_start = i + 1
                break
        else:
            blank_start = 0
        
        # Find the end of the blank (after all underscores)
        blank_end = match.end()
        
        # Replace the blank (hint + underscores) with answer
        before_blank = self.current_problem[:blank_start]
        after_blank = self.current_problem[blank_end:]
        self.current_problem = before_blank + answer + after_blank
        
        self.problem_text.configure(state="normal")
        self.problem_text.delete("1.0", "end")
        self.problem_text.insert("end", self.current_problem)
        
        # Highlight
        start_idx = f"1.0 + {blank_start} chars"
        end_idx = f"1.0 + {blank_start + len(answer)} chars"
        tag = "correct" if correct else "wrong"
        self.problem_text.tag_add(tag, start_idx, end_idx)
        
        self.problem_text.configure(state="disabled")

    def next_problem(self):
        try:
            self.scripture.pop(self.problem_num)
            self.left_verse -= 1
        except:
            pass
        self.update_status()
        self.display_problem()
        self.answer_entry.delete(0, "end")

    def skip_problem(self):
        self.display_problem()

    def show_hint(self):
        """Show progressive hints for the current answer"""
        if not self.current_answers or self.problem_completed:
            return
        
        answer = self.current_answers[0]
        
        # Determine hint text based on hint count
        if self.hint_count == 0:
            # Step 1: First character
            hint_text = answer[0] if answer else ""
        elif self.hint_count == 1:
            # Step 2: Half (or full if short)
            if len(answer) <= 2:
                hint_text = answer
            else:
                half = (len(answer) + 1) // 2
                hint_text = answer[:half]
        else:
            # Step 3: Full answer
            hint_text = answer
        
        self.hint_count += 1
        self.score -= 2
        self.update_status()
        self.attempts += 1 # Deduct attempt for using hint
        
        # Find the first blank (underscore sequence) in current problem
        match = re.search(r'_+', self.current_problem)
        if not match:
            return
        
        blank_start = match.start()
        blank_end = match.end()
        
        # Replace the blank with hint
        before_blank = self.current_problem[:blank_start]
        after_blank = self.current_problem[blank_end:]
        
        # Create display text (DO NOT modify current_problem)
        remaining_underscores = '_' * (len(answer) - len(hint_text))
        display_text = before_blank + hint_text + remaining_underscores + after_blank
        
        # Update display
        self.problem_text.configure(state="normal")
        self.problem_text.delete("1.0", "end")
        self.problem_text.insert("end", display_text)
        
        # Apply hint tag to the hint text
        hint_start_idx = f"1.0 + {blank_start} chars"
        hint_end_idx = f"1.0 + {blank_start + len(hint_text)} chars"
        self.problem_text.tag_add("hint", hint_start_idx, hint_end_idx)
        
        self.problem_text.configure(state="disabled")
        self.answer_entry.focus_set()

    def on_space_key(self, event):
        if event.char == " ":
            self.after(10, self.submit_answer)
            return "break"

    # --- Popups ---
    def open_add_verse_popup(self):
        if not self.original_filenames:
            messagebox.showinfo("알림", "일차(파일)를 먼저 추가해주세요.")
            return

        win = ctk.CTkToplevel(self)
        win.title("구절 추가")
        win.geometry("400x500")
        win.grab_set()

        ctk.CTkLabel(win, text="장절 예: (요 3:16)").pack(pady=(10, 0))
        ref_entry = ctk.CTkEntry(win, width=300)
        ref_entry.pack(pady=5)

        ctk.CTkLabel(win, text="구절 내용").pack(pady=(10, 0))
        verse_text = ctk.CTkTextbox(win, height=100, width=300)
        verse_text.pack(pady=5)

        ctk.CTkLabel(win, text="과정 선택").pack(pady=(10, 0))
        level_var = ctk.StringVar(value="없음")
        level_cb = ctk.CTkComboBox(win, values=["없음", "1", "2", "3", "4"], variable=level_var, width=100)
        level_cb.pack(pady=5)

        ctk.CTkLabel(win, text="저장할 파일").pack(pady=(10, 0))
        file_var = ctk.StringVar(value=self.original_filenames[0])
        file_cb = ctk.CTkComboBox(win, values=self.original_filenames, variable=file_var)
        file_cb.pack(pady=5)

        def save():
            ref = ref_entry.get().strip()
            content = verse_text.get("1.0", "end").strip()
            fname = file_var.get().strip()
            level = level_var.get()
            
            if not ref or not content:
                messagebox.showwarning("경고", "내용을 입력해주세요.")
                return
            
            if not (ref.startswith("(") and ref.endswith(")")):
                messagebox.showwarning("경고", "장절 형식이 올바르지 않습니다. 예: (요 3:16)")
                return

            if getattr(sys, 'frozen', False):
                local_data_dir = os.path.join(os.path.dirname(sys.executable), "data")
            else:
                local_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
            
            if not os.path.exists(local_data_dir):
                os.makedirs(local_data_dir)
                
            p = os.path.join(local_data_dir, fname)
            
            try:
                need_newline = False
                if os.path.exists(p):
                    with open(p, "rb") as f:
                        try:
                            f.seek(-1, os.SEEK_END)
                            if f.read(1) != b'\n':
                                need_newline = True
                        except:
                            pass
                
                with open(p, "a", encoding="utf-8") as f:
                    if need_newline:
                        f.write("\n")
                    
                    if level == "없음":
                        f.write(f"{ref}^{content}")
                    else:
                        f.write(f"{level}\\{ref}^{content}")
                
                messagebox.showinfo("성공", "저장되었습니다.")
                self.load_data()
                self.refresh_day_menu()
                win.destroy()
            except Exception as e:
                messagebox.showerror("오류", str(e))

        ctk.CTkButton(win, text="저장", command=save).pack(pady=20)

    def open_add_day_popup(self):
        win = ctk.CTkToplevel(self)
        win.title("일차 추가")
        win.geometry("300x200")
        win.grab_set()

        ctk.CTkLabel(win, text="일차 이름 (예: day2)").pack(pady=10)
        name_entry = ctk.CTkEntry(win)
        name_entry.pack(pady=5)

        def create():
            name = name_entry.get().strip()
            if not name:
                return
            if not name.endswith(".txt"):
                name += ".txt"
            
            if getattr(sys, 'frozen', False):
                local_data_dir = os.path.join(os.path.dirname(sys.executable), "data")
            else:
                local_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
            
            if not os.path.exists(local_data_dir):
                os.makedirs(local_data_dir)
            
            p = os.path.join(local_data_dir, name)
            if os.path.exists(p):
                messagebox.showwarning("경고", "이미 존재하는 파일입니다.")
                return
                
            try:
                with open(p, "w", encoding="utf-8") as f:
                    pass
                messagebox.showinfo("성공", "생성되었습니다.")
                self.load_data()
                self.refresh_day_menu()
                win.destroy()
            except Exception as e:
                messagebox.showerror("오류", str(e))

        ctk.CTkButton(win, text="생성", command=create).pack(pady=20)

    def delete_verse_popup(self):
        if not self.original_filenames:
            return
        
        win = ctk.CTkToplevel(self)
        win.title("구절 삭제")
        win.geometry("500x600")
        win.grab_set()

        ctk.CTkLabel(win, text="파일 선택").pack(pady=5)
        file_var = ctk.StringVar(value=self.original_filenames[0])
        file_cb = ctk.CTkComboBox(win, values=self.original_filenames, variable=file_var, command=lambda x: load_verses(x))
        file_cb.pack(pady=5)

        list_frame = ctk.CTkScrollableFrame(win, width=450, height=400)
        list_frame.pack(pady=10)
        
        self.check_vars = []
        
        def load_verses(fname):
            for w in list_frame.winfo_children():
                w.destroy()
            self.check_vars = []
            
            if fname in self.original_filenames:
                idx = self.original_filenames.index(fname)
                verses = self.original_scriptures[idx]
                for i, v in enumerate(verses):
                    var = ctk.IntVar()
                    self.check_vars.append((i, var))
                    ctk.CTkCheckBox(list_frame, text=v[:40]+"...", variable=var).pack(anchor="w", pady=2)

        load_verses(file_var.get())

        def delete():
            fname = file_var.get()
            if fname not in self.original_filenames: return
            
            idx = self.original_filenames.index(fname)
            verses = self.original_scriptures[idx]
            to_delete_indices = [i for i, var in self.check_vars if var.get() == 1]
            
            if not to_delete_indices:
                return

            if not messagebox.askyesno("확인", f"{len(to_delete_indices)}개의 구절을 삭제하시겠습니까?"):
                return

            new_verses = [v for i, v in enumerate(verses) if i not in to_delete_indices]
            
            if getattr(sys, 'frozen', False):
                local_data_dir = os.path.join(os.path.dirname(sys.executable), "data")
            else:
                local_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
            
            p = os.path.join(local_data_dir, fname)
            
            try:
                with open(p, "w", encoding="utf-8") as f:
                    for v in new_verses:
                        f.write(v + "\n")
                
                messagebox.showinfo("성공", "삭제되었습니다.")
                self.load_data()
                self.refresh_day_menu()
                if self.day_num > 0:
                    self.select_day(self.day_num - 1)
                win.destroy()
            except Exception as e:
                messagebox.showerror("오류", str(e))

        ctk.CTkButton(win, text="삭제", command=delete, fg_color="#C0392B", hover_color="#E74C3C").pack(pady=10)

    def delete_file_popup(self):
        if not self.original_filenames: return
        
        win = ctk.CTkToplevel(self)
        win.title("일차 삭제")
        win.geometry("300x150")
        win.grab_set()

        ctk.CTkLabel(win, text="삭제할 일차").pack(pady=10)
        file_var = ctk.StringVar(value=self.original_filenames[0])
        file_cb = ctk.CTkComboBox(win, values=self.original_filenames, variable=file_var)
        file_cb.pack(pady=5)

        def delete():
            fname = file_var.get()
            if not messagebox.askyesno("확인", f"정말 '{fname}'을 삭제하시겠습니까?"):
                return
            
            if getattr(sys, 'frozen', False):
                local_data_dir = os.path.join(os.path.dirname(sys.executable), "data")
            else:
                local_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
            
            p = os.path.join(local_data_dir, fname)
            try:
                os.remove(p)
                messagebox.showinfo("성공", "삭제되었습니다.")
                self.load_data()
                self.refresh_day_menu()
                self.day_reset()
                win.destroy()
            except Exception as e:
                messagebox.showerror("오류", str(e))

        ctk.CTkButton(win, text="삭제", command=delete, fg_color="#C0392B", hover_color="#E74C3C").pack(pady=10)

    def open_edit_verse_popup(self):
        if not self.original_filenames: return
        
        win = ctk.CTkToplevel(self)
        win.title("구절 수정")
        win.geometry("500x600")
        win.grab_set()

        ctk.CTkLabel(win, text="파일 선택").pack(pady=5)
        file_var = ctk.StringVar(value=self.original_filenames[0])
        file_cb = ctk.CTkComboBox(win, values=self.original_filenames, variable=file_var, command=lambda x: load_verses(x))
        file_cb.pack(pady=5)

        list_frame = ctk.CTkScrollableFrame(win, width=450, height=200)
        list_frame.pack(pady=10)

        edit_frame = ctk.CTkFrame(win)
        edit_frame.pack(pady=10, padx=10, fill="x")
        
        ctk.CTkLabel(edit_frame, text="수정할 내용").pack()
        edit_text = ctk.CTkTextbox(edit_frame, height=100)
        edit_text.pack(fill="x", padx=5)
        
        self.selected_verse_idx = -1

        def load_verses(fname):
            for w in list_frame.winfo_children():
                w.destroy()
            self.selected_verse_idx = -1
            edit_text.delete("1.0", "end")
            
            if fname in self.original_filenames:
                idx = self.original_filenames.index(fname)
                verses = self.original_scriptures[idx]
                for i, v in enumerate(verses):
                    btn = ctk.CTkButton(list_frame, text=v[:40]+"...", command=lambda idx=i, val=v: select_verse(idx, val), fg_color="transparent", border_width=1, text_color=("black", "white"))
                    btn.pack(anchor="w", pady=2, fill="x")

        def select_verse(idx, val):
            self.selected_verse_idx = idx
            edit_text.delete("1.0", "end")
            edit_text.insert("end", val)

        load_verses(file_var.get())

        def save_edit():
            if self.selected_verse_idx == -1: return
            new_content = edit_text.get("1.0", "end").strip()
            if not new_content: return
            
            fname = file_var.get()
            idx = self.original_filenames.index(fname)
            self.original_scriptures[idx][self.selected_verse_idx] = new_content
            
            if getattr(sys, 'frozen', False):
                local_data_dir = os.path.join(os.path.dirname(sys.executable), "data")
            else:
                local_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
            
            p = os.path.join(local_data_dir, fname)
            try:
                with open(p, "w", encoding="utf-8") as f:
                    for v in self.original_scriptures[idx]:
                        f.write(v + "\n")
                messagebox.showinfo("성공", "수정되었습니다.")
                self.load_data()
                self.refresh_day_menu()
                if self.day_num > 0:
                    self.select_day(self.day_num - 1)
                win.destroy()
            except Exception as e:
                messagebox.showerror("오류", str(e))

        ctk.CTkButton(win, text="수정 저장", command=save_edit).pack(pady=10)

    def open_data_folder(self):
        if getattr(sys, 'frozen', False):
            local_data_dir = os.path.join(os.path.dirname(sys.executable), "data")
        else:
            local_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        
        if not os.path.exists(local_data_dir):
            os.makedirs(local_data_dir)
        os.startfile(local_data_dir)

    def open_blank_level(self):
        win = ctk.CTkToplevel(self)
        win.title("빈칸 난이도")
        win.geometry("300x400")
        win.grab_set()
        
        for i in range(11):
            ctk.CTkButton(win, text=f"{i}0%", command=lambda x=i: set_level(x, win)).pack(pady=2)

        def set_level(x, w):
            self.blank_num = x + 1
            self.set_mode(1)
            w.destroy()

    def open_whole_level(self):
        win = ctk.CTkToplevel(self)
        win.title("어절 수")
        win.geometry("300x300")
        win.grab_set()
        
        for i in range(1, 6):
            ctk.CTkButton(win, text=f"{i}어절", command=lambda x=i: set_level(x, win)).pack(pady=5)

        def set_level(x, w):
            self.whole_level_num = x
            self.set_mode(4)
            w.destroy()

    def show_mode_info(self):
        info = """
        1. 빈칸 모드: 구절의 일부를 빈칸으로 가립니다.
        2. 구절 모드: 장절만 보여주고 내용은 모두 가립니다.
        3. 장절 모드: 내용은 보여주고 장절만 가립니다.
        4. 전체 모드: 일부 어절만 보여주고 나머지는 가립니다.
        """
        messagebox.showinfo("도움말", info)

    def increase_font(self):
        self.font_size += 2
        self.update_font()

    def decrease_font(self):
        if self.font_size > 10:
            self.font_size -= 2
            self.update_font()

    def update_font(self):
        self.problem_text.configure(font=(self.font_family, self.font_size))
        self.answer_entry.configure(font=(self.font_family, self.font_size))

    def set_theme(self, theme):
        ctk.set_appearance_mode(theme)
        self.config_data["theme"] = theme

    def show_wrong_verses(self):
        if not self.wrong_verses:
            messagebox.showinfo("알림", "틀린 구절이 없습니다.")
            return
        
        win = ctk.CTkToplevel(self)
        win.title("틀린 구절 모음")
        win.geometry("600x400")
        
        text_box = ctk.CTkTextbox(win, font=(self.font_family, 18))
        text_box.pack(fill="both", expand=True, padx=10, pady=10)
        
        for i, w in enumerate(self.wrong_verses, 1):
            text_box.insert("end", f"{i}. {w['reference']} {w['verse']}\n\n")
        text_box.configure(state="disabled")
        
        def review():
            self.scripture = [w['full_text'] for w in self.wrong_verses]
            self.left_verse = len(self.scripture)
            self.fail_num = 0
            self.wrong_verses = []
            self.update_status()
            self.display_problem()
            win.destroy()
            
        ctk.CTkButton(win, text="복습하기", command=review).pack(pady=10)

    def on_closing(self):
        # Save settings
        self.config_data["font_size"] = self.font_size
        if self.day_num > 0:
            self.config_data["last_day_index"] = self.day_num - 1
        self.config_manager.save(self.config_data)
        self.destroy()

if __name__ == "__main__":
    app = BibleApp()
    app.mainloop()
