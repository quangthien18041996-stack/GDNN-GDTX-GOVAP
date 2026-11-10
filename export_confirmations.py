import json
import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, 'data', 'teachers.json')
CONFIRM_PATH = os.path.join(BASE_DIR, 'data', 'confirmations.json')
OUTPUT_FILE = os.path.join(BASE_DIR, 'data', 'XAC_NHAN_LUONG_T10_2026.xlsx')

def export():
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        teachers = json.load(f)

    confirmations = {}
    if os.path.exists(CONFIRM_PATH):
        with open(CONFIRM_PATH, 'r', encoding='utf-8') as f:
            confirmations = json.load(f)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'XacNhanLuong'

    # Styles
    title_font = Font(name='Times New Roman', size=14, bold=True, color='0F3D64')
    header_font = Font(name='Times New Roman', size=11, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='0F3D64', end_color='0F3D64', fill_type='solid')
    body_font = Font(name='Times New Roman', size=11)
    bold_body_font = Font(name='Times New Roman', size=11, bold=True)
    correct_fill = PatternFill(start_color='D1FAE5', end_color='D1FAE5', fill_type='solid')
    incorrect_fill = PatternFill(start_color='FEE2E2', end_color='FEE2E2', fill_type='solid')

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # Title
    ws.merge_cells('A2:F2')
    ws['A2'] = 'BẢNG THEO DÕI XÁC NHẬN LƯƠNG & PHỤ CẤP - THÁNG 10/2026'
    ws['A2'].font = title_font
    ws['A2'].alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[2].height = 28

    # Headers
    headers = ['STT', 'MS', 'CCCD', 'Họ và tên', 'Xác nhận về thông tin', 'Ghi chú']
    for col_idx, h in enumerate(headers, start=1):
        cell = ws.cell(row=5, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = thin_border
    ws.row_dimensions[5].height = 24

    # Rows
    for idx, t in enumerate(teachers, start=6):
        cccd = str(t.get('cccd', '')).strip()
        conf = confirmations.get(cccd, {})
        status = conf.get('status', '')
        note = conf.get('note', '')

        row_vals = [
            t.get('stt', idx - 5),
            t.get('ms', ''),
            cccd,
            t.get('ho_ten', ''),
            status,
            note
        ]

        for col_idx, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=idx, column=col_idx, value=val)
            cell.font = body_font
            cell.border = thin_border

            if col_idx == 1 or col_idx == 2:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif col_idx == 3:
                cell.alignment = Alignment(horizontal='center', vertical='center')
                cell.number_format = '@'
            elif col_idx == 4:
                cell.alignment = Alignment(horizontal='left', vertical='center')
            elif col_idx == 5:
                cell.alignment = Alignment(horizontal='center', vertical='center')
                if status == 'Đúng thông tin':
                    cell.fill = correct_fill
                    cell.font = bold_body_font
                elif status == 'Chưa đúng thông tin':
                    cell.fill = incorrect_fill
                    cell.font = bold_body_font
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center')

        ws.row_dimensions[idx].height = 20

    # Auto-adjust column widths
    col_widths = {1: 8, 2: 10, 3: 16, 4: 28, 5: 22, 6: 35}
    for col, width in col_widths.items():
        ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = width

    wb.save(OUTPUT_FILE)
    print(f'[+] Exported successfully: {OUTPUT_FILE}')

if __name__ == '__main__':
    export()
