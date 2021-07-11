/* eslint-disable camelcase */
/**
 * Types generated by `yarn generate-types`. Do not edit manually.
 *
 * Version: 0.5.0
 * Api Level: 7
 * Api Compatible: 0
 * Api Prerelease: false
 */

/**
 * UI events types emitted by `redraw` event. Do not edit manually.
 * More info: https://neovim.io/doc/user/ui.html
 */
export type UiEvents = {
  mode_info_set: [enabled: boolean, cursor_styles: Array<any>];

  update_menu: [];

  busy_start: [];

  busy_stop: [];

  mouse_on: [];

  mouse_off: [];

  mode_change: [mode: string, mode_idx: number];

  bell: [];

  visual_bell: [];

  flush: [];

  suspend: [];

  set_title: [title: string];

  set_icon: [icon: string];

  screenshot: [path: string];

  option_set: [name: string, value: any];

  update_fg: [fg: number];

  update_bg: [bg: number];

  update_sp: [sp: number];

  resize: [width: number, height: number];

  clear: [];

  eol_clear: [];

  cursor_goto: [row: number, col: number];

  highlight_set: [attrs: Record<string, any>];

  put: [str: string];

  set_scroll_region: [top: number, bot: number, left: number, right: number];

  scroll: [count: number];

  default_colors_set: [
    rgb_fg: number,
    rgb_bg: number,
    rgb_sp: number,
    cterm_fg: number,
    cterm_bg: number,
  ];

  hl_attr_define: [
    id: number,
    rgb_attrs: Record<string, any>,
    cterm_attrs: Record<string, any>,
    info: Array<any>,
  ];

  hl_group_set: [name: string, id: number];

  grid_resize: [grid: number, width: number, height: number];

  grid_clear: [grid: number];

  grid_cursor_goto: [grid: number, row: number, col: number];

  grid_line: [grid: number, row: number, col_start: number, data: Array<any>];

  grid_scroll: [
    grid: number,
    top: number,
    bot: number,
    left: number,
    right: number,
    rows: number,
    cols: number,
  ];

  grid_destroy: [grid: number];

  win_pos: [
    grid: number,
    win: number,
    startrow: number,
    startcol: number,
    width: number,
    height: number,
  ];

  win_float_pos: [
    grid: number,
    win: number,
    anchor: string,
    anchor_grid: number,
    anchor_row: number,
    anchor_col: number,
    focusable: boolean,
    zindex: number,
  ];

  win_external_pos: [grid: number, win: number];

  win_hide: [grid: number];

  win_close: [grid: number];

  msg_set_pos: [grid: number, row: number, scrolled: boolean, sep_char: string];

  win_viewport: [
    grid: number,
    win: number,
    topline: number,
    botline: number,
    curline: number,
    curcol: number,
  ];

  popupmenu_show: [items: Array<any>, selected: number, row: number, col: number, grid: number];

  popupmenu_hide: [];

  popupmenu_select: [selected: number];

  tabline_update: [current: number, tabs: Array<any>, current_buffer: number, buffers: Array<any>];

  cmdline_show: [
    content: Array<any>,
    pos: number,
    firstc: string,
    prompt: string,
    indent: number,
    level: number,
  ];

  cmdline_pos: [pos: number, level: number];

  cmdline_special_char: [c: string, shift: boolean, level: number];

  cmdline_hide: [level: number];

  cmdline_block_show: [lines: Array<any>];

  cmdline_block_append: [lines: Array<any>];

  cmdline_block_hide: [];

  wildmenu_show: [items: Array<any>];

  wildmenu_select: [selected: number];

  wildmenu_hide: [];

  msg_show: [kind: string, content: Array<any>, replace_last: boolean];

  msg_clear: [];

  msg_showcmd: [content: Array<any>];

  msg_showmode: [content: Array<any>];

  msg_ruler: [content: Array<any>];

  msg_history_show: [entries: Array<any>];
};

/**
 * Nvim commands.
 * More info: https://neovim.io/doc/user/api.html
 */
export type NvimCommands = {
  nvim_buf_line_count: (buffer: number) => number;

  nvim_buf_attach: (buffer: number, send_buffer: boolean, opts: Record<string, any>) => boolean;

  nvim_buf_detach: (buffer: number) => boolean;

  nvim_buf_get_lines: (
    buffer: number,
    start: number,
    end: number,
    strict_indexing: boolean,
  ) => string[];

  nvim_buf_set_lines: (
    buffer: number,
    start: number,
    end: number,
    strict_indexing: boolean,
    replacement: string[],
  ) => void;

  nvim_buf_set_text: (
    buffer: number,
    start_row: number,
    start_col: number,
    end_row: number,
    end_col: number,
    replacement: string[],
  ) => void;

  nvim_buf_get_offset: (buffer: number, index: number) => number;

  nvim_buf_get_var: (buffer: number, name: string) => any;

  nvim_buf_get_changedtick: (buffer: number) => number;

  nvim_buf_get_keymap: (buffer: number, mode: string) => Record<string, any>[];

  nvim_buf_set_keymap: (
    buffer: number,
    mode: string,
    lhs: string,
    rhs: string,
    opts: Record<string, any>,
  ) => void;

  nvim_buf_del_keymap: (buffer: number, mode: string, lhs: string) => void;

  nvim_buf_get_commands: (buffer: number, opts: Record<string, any>) => Record<string, any>;

  nvim_buf_set_var: (buffer: number, name: string, value: any) => void;

  nvim_buf_del_var: (buffer: number, name: string) => void;

  nvim_buf_get_option: (buffer: number, name: string) => any;

  nvim_buf_set_option: (buffer: number, name: string, value: any) => void;

  nvim_buf_get_name: (buffer: number) => string;

  nvim_buf_set_name: (buffer: number, name: string) => void;

  nvim_buf_is_loaded: (buffer: number) => boolean;

  nvim_buf_delete: (buffer: number, opts: Record<string, any>) => void;

  nvim_buf_is_valid: (buffer: number) => boolean;

  nvim_buf_get_mark: (buffer: number, name: string) => [number, number];

  nvim_buf_get_extmark_by_id: (
    buffer: number,
    ns_id: number,
    id: number,
    opts: Record<string, any>,
  ) => number[];

  nvim_buf_get_extmarks: (
    buffer: number,
    ns_id: number,
    start: any,
    end: any,
    opts: Record<string, any>,
  ) => Array<any>;

  nvim_buf_set_extmark: (
    buffer: number,
    ns_id: number,
    line: number,
    col: number,
    opts: Record<string, any>,
  ) => number;

  nvim_buf_del_extmark: (buffer: number, ns_id: number, id: number) => boolean;

  nvim_buf_add_highlight: (
    buffer: number,
    ns_id: number,
    hl_group: string,
    line: number,
    col_start: number,
    col_end: number,
  ) => number;

  nvim_buf_clear_namespace: (
    buffer: number,
    ns_id: number,
    line_start: number,
    line_end: number,
  ) => void;

  nvim_buf_set_virtual_text: (
    buffer: number,
    src_id: number,
    line: number,
    chunks: Array<any>,
    opts: Record<string, any>,
  ) => number;

  nvim_buf_call: (buffer: number, fun: any) => any;

  nvim_tabpage_list_wins: (tabpage: number) => number[];

  nvim_tabpage_get_var: (tabpage: number, name: string) => any;

  nvim_tabpage_set_var: (tabpage: number, name: string, value: any) => void;

  nvim_tabpage_del_var: (tabpage: number, name: string) => void;

  nvim_tabpage_get_win: (tabpage: number) => number;

  nvim_tabpage_get_number: (tabpage: number) => number;

  nvim_tabpage_is_valid: (tabpage: number) => boolean;

  nvim_ui_attach: (width: number, height: number, options: Record<string, any>) => void;

  nvim_ui_detach: () => void;

  nvim_ui_try_resize: (width: number, height: number) => void;

  nvim_ui_set_option: (name: string, value: any) => void;

  nvim_ui_try_resize_grid: (grid: number, width: number, height: number) => void;

  nvim_ui_pum_set_height: (height: number) => void;

  nvim_ui_pum_set_bounds: (width: number, height: number, row: number, col: number) => void;

  nvim_exec: (src: string, output: boolean) => string;

  nvim_command: (command: string) => void;

  nvim_get_hl_by_name: (name: string, rgb: boolean) => Record<string, any>;

  nvim_get_hl_by_id: (hl_id: number, rgb: boolean) => Record<string, any>;

  nvim_get_hl_id_by_name: (name: string) => number;

  nvim_set_hl: (ns_id: number, name: string, val: Record<string, any>) => void;

  nvim_feedkeys: (keys: string, mode: string, escape_csi: boolean) => void;

  nvim_input: (keys: string) => number;

  nvim_input_mouse: (
    button: string,
    action: string,
    modifier: string,
    grid: number,
    row: number,
    col: number,
  ) => void;

  nvim_replace_termcodes: (
    str: string,
    from_part: boolean,
    do_lt: boolean,
    special: boolean,
  ) => string;

  nvim_eval: (expr: string) => any;

  nvim_exec_lua: (code: string, args: Array<any>) => any;

  nvim_notify: (msg: string, log_level: number, opts: Record<string, any>) => any;

  nvim_call_function: (fn: string, args: Array<any>) => any;

  nvim_call_dict_function: (dict: any, fn: string, args: Array<any>) => any;

  nvim_strwidth: (text: string) => number;

  nvim_list_runtime_paths: () => string[];

  nvim_get_runtime_file: (name: string, all: boolean) => string[];

  nvim_set_current_dir: (dir: string) => void;

  nvim_get_current_line: () => string;

  nvim_set_current_line: (line: string) => void;

  nvim_del_current_line: () => void;

  nvim_get_var: (name: string) => any;

  nvim_set_var: (name: string, value: any) => void;

  nvim_del_var: (name: string) => void;

  nvim_get_vvar: (name: string) => any;

  nvim_set_vvar: (name: string, value: any) => void;

  nvim_get_option: (name: string) => any;

  nvim_get_all_options_info: () => Record<string, any>;

  nvim_get_option_info: (name: string) => Record<string, any>;

  nvim_set_option: (name: string, value: any) => void;

  nvim_echo: (chunks: Array<any>, history: boolean, opts: Record<string, any>) => void;

  nvim_out_write: (str: string) => void;

  nvim_err_write: (str: string) => void;

  nvim_err_writeln: (str: string) => void;

  nvim_list_bufs: () => number[];

  nvim_get_current_buf: () => number;

  nvim_set_current_buf: (buffer: number) => void;

  nvim_list_wins: () => number[];

  nvim_get_current_win: () => number;

  nvim_set_current_win: (win: number) => void;

  nvim_create_buf: (listed: boolean, scratch: boolean) => number;

  nvim_open_term: (buffer: number, opts: Record<string, any>) => number;

  nvim_chan_send: (chan: number, data: string) => void;

  nvim_open_win: (buffer: number, enter: boolean, config: Record<string, any>) => number;

  nvim_list_tabpages: () => number[];

  nvim_get_current_tabpage: () => number;

  nvim_set_current_tabpage: (tabpage: number) => void;

  nvim_create_namespace: (name: string) => number;

  nvim_get_namespaces: () => Record<string, any>;

  nvim_paste: (data: string, crlf: boolean, phase: number) => boolean;

  nvim_put: (lines: string[], type: string, after: boolean, follow: boolean) => void;

  nvim_subscribe: (event: string) => void;

  nvim_unsubscribe: (event: string) => void;

  nvim_get_color_by_name: (name: string) => number;

  nvim_get_color_map: () => Record<string, any>;

  nvim_get_context: (opts: Record<string, any>) => Record<string, any>;

  nvim_load_context: (dict: Record<string, any>) => any;

  nvim_get_mode: () => Record<string, any>;

  nvim_get_keymap: (mode: string) => Record<string, any>[];

  nvim_set_keymap: (mode: string, lhs: string, rhs: string, opts: Record<string, any>) => void;

  nvim_del_keymap: (mode: string, lhs: string) => void;

  nvim_get_commands: (opts: Record<string, any>) => Record<string, any>;

  nvim_get_api_info: () => Array<any>;

  nvim_set_client_info: (
    name: string,
    version: Record<string, any>,
    type: string,
    methods: Record<string, any>,
    attributes: Record<string, any>,
  ) => void;

  nvim_get_chan_info: (chan: number) => Record<string, any>;

  nvim_list_chans: () => Array<any>;

  nvim_call_atomic: (calls: Array<any>) => Array<any>;

  nvim_parse_expression: (expr: string, flags: string, highlight: boolean) => Record<string, any>;

  nvim_list_uis: () => Array<any>;

  nvim_get_proc_children: (pid: number) => Array<any>;

  nvim_get_proc: (pid: number) => any;

  nvim_select_popupmenu_item: (
    item: number,
    insert: boolean,
    finish: boolean,
    opts: Record<string, any>,
  ) => void;

  nvim_set_decoration_provider: (ns_id: number, opts: Record<string, any>) => void;

  nvim_win_get_buf: (win: number) => number;

  nvim_win_set_buf: (win: number, buffer: number) => void;

  nvim_win_get_cursor: (win: number) => [number, number];

  nvim_win_set_cursor: (win: number, pos: [number, number]) => void;

  nvim_win_get_height: (win: number) => number;

  nvim_win_set_height: (win: number, height: number) => void;

  nvim_win_get_width: (win: number) => number;

  nvim_win_set_width: (win: number, width: number) => void;

  nvim_win_get_var: (win: number, name: string) => any;

  nvim_win_set_var: (win: number, name: string, value: any) => void;

  nvim_win_del_var: (win: number, name: string) => void;

  nvim_win_get_option: (win: number, name: string) => any;

  nvim_win_set_option: (win: number, name: string, value: any) => void;

  nvim_win_get_position: (win: number) => [number, number];

  nvim_win_get_tabpage: (win: number) => number;

  nvim_win_get_number: (win: number) => number;

  nvim_win_is_valid: (win: number) => boolean;

  nvim_win_set_config: (win: number, config: Record<string, any>) => void;

  nvim_win_get_config: (win: number) => Record<string, any>;

  nvim_win_hide: (win: number) => void;

  nvim_win_close: (win: number, force: boolean) => void;

  nvim_win_call: (win: number, fun: any) => any;
};
