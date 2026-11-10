import urllib.request
import openpyxl
import json
import os
import sys

# URL Google Sheets nguồn
SHEET_URL = "https://docs.google.com/spreadsheets/d/1pOyFD6PvnWmQCEkFJSjHDJK-WgMkhjeK/export?format=xlsx"
DATA_OUTPUT = os.path.join(os.path.dirname(__file__), "data", "teachers.json")
TEMP_XLSX = os.path.join(os.path.dirname(__file__), "temp_sync.xlsx")

def to_float(val):
    if val is None:
        return 0.0
    val_str = str(val).strip().replace(',', '.')
    val_str = val_str.replace('%', '')
    if not val_str:
        return 0.0
    try:
        f = float(val_str)
        if '%' in str(val):
            return f / 100.0
        return f
    except ValueError:
        return 0.0

def sync():
    print(f"[*] Đang tải dữ liệu từ Google Sheets...")
    urllib.request.urlretrieve(SHEET_URL, TEMP_XLSX)

    wb = openpyxl.load_workbook(TEMP_XLSX, data_only=True)
    ws = wb.active

    teachers = []
    # Dữ liệu bắt đầu từ dòng 6
    for r in range(6, ws.max_row + 1):
        stt = ws.cell(r, 1).value
        ms = ws.cell(r, 2).value
        cccd = ws.cell(r, 3).value
        hoten = ws.cell(r, 4).value
        chucvu = ws.cell(r, 5).value
        mangach = ws.cell(r, 6).value
        hsl = ws.cell(r, 7).value
        pccv = ws.cell(r, 8).value
        tnvk = ws.cell(r, 9).value
        udgv = ws.cell(r, 10).value
        tnng = ws.cell(r, 11).value
        sotk = ws.cell(r, 12).value

        if cccd or hoten:
            cccd_str = str(cccd).strip() if cccd else ''
            if len(cccd_str) < 12 and cccd_str.isdigit():
                cccd_str = cccd_str.zfill(12)

            teachers.append({
                'stt': int(stt) if stt and str(stt).strip().isdigit() else len(teachers) + 1,
                'ms': str(ms).strip() if ms else '',
                'cccd': cccd_str,
                'ho_ten': str(hoten).strip() if hoten else '',
                'chuc_vu': str(chucvu).strip() if chucvu else '',
                'ma_ngach': str(mangach).strip() if mangach else '',
                'hsl': to_float(hsl),
                'pccv': to_float(pccv),
                'tnvk': to_float(tnvk),
                'udgv': to_float(udgv),
                'tnng': to_float(tnng),
                'so_tk': str(sotk).strip() if sotk else ''
            })

    if os.path.exists(TEMP_XLSX):
        os.remove(TEMP_XLSX)

    os.makedirs(os.path.dirname(DATA_OUTPUT), exist_ok=True)
    with open(DATA_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(teachers, f, ensure_ascii=False, indent=2)

    print(f"[+] Đồng bộ thành công {len(teachers)} hồ sơ nhân sự vào {DATA_OUTPUT}!")

if __name__ == "__main__":
    sync()
