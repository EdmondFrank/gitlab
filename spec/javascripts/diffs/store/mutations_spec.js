import createState from '~/diffs/store/modules/diff_state';
import mutations from '~/diffs/store/mutations';
import * as types from '~/diffs/store/mutation_types';
import { INLINE_DIFF_VIEW_TYPE } from '~/diffs/constants';
import diffFileMockData from '../mock_data/diff_file';

describe('DiffsStoreMutations', () => {
  describe('SET_BASE_CONFIG', () => {
    it('should set endpoint and project path', () => {
      const state = {};
      const endpoint = '/diffs/endpoint';
      const projectPath = '/root/project';

      mutations[types.SET_BASE_CONFIG](state, { endpoint, projectPath });

      expect(state.endpoint).toEqual(endpoint);
      expect(state.projectPath).toEqual(projectPath);
    });
  });

  describe('SET_LOADING', () => {
    it('should set loading state', () => {
      const state = {};

      mutations[types.SET_LOADING](state, false);

      expect(state.isLoading).toEqual(false);
    });
  });

  describe('SET_DIFF_DATA', () => {
    it('should set diff data type properly', () => {
      const state = {};
      const diffMock = {
        diff_files: [diffFileMockData],
      };

      mutations[types.SET_DIFF_DATA](state, diffMock);

      const firstLine = state.diffFiles[0].parallel_diff_lines[0];

      expect(firstLine.right.text).toBeUndefined();
      expect(state.diffFiles[0].renderIt).toEqual(true);
      expect(state.diffFiles[0].collapsed).toEqual(false);
    });
  });

  describe('SET_DIFF_VIEW_TYPE', () => {
    it('should set diff view type properly', () => {
      const state = {};

      mutations[types.SET_DIFF_VIEW_TYPE](state, INLINE_DIFF_VIEW_TYPE);

      expect(state.diffViewType).toEqual(INLINE_DIFF_VIEW_TYPE);
    });
  });

  describe('EXPAND_ALL_FILES', () => {
    it('should change the collapsed prop from diffFiles', () => {
      const diffFile = {
        collapsed: true,
      };
      const state = { expandAllFiles: true, diffFiles: [diffFile] };

      mutations[types.EXPAND_ALL_FILES](state);

      expect(state.diffFiles[0].collapsed).toEqual(false);
    });
  });

  describe('ADD_CONTEXT_LINES', () => {
    it('should call utils.addContextLines with proper params', () => {
      const options = {
        lineNumbers: { oldLineNumber: 1, newLineNumber: 2 },
        contextLines: [
          { old_line: 1, new_line: 1, line_code: 'ff9200_1_1', discussions: [], hasForm: false },
        ],
        fileHash: 'ff9200',
        params: {
          bottom: true,
        },
      };
      const diffFile = {
        file_hash: options.fileHash,
        highlighted_diff_lines: [],
        parallel_diff_lines: [],
      };
      const state = { diffFiles: [diffFile] };
      const lines = [{ old_line: 1, new_line: 1 }];

      const findDiffFileSpy = spyOnDependency(mutations, 'findDiffFile').and.returnValue(diffFile);
      const removeMatchLineSpy = spyOnDependency(mutations, 'removeMatchLine');
      const lineRefSpy = spyOnDependency(mutations, 'addLineReferences').and.returnValue(lines);
      const addContextLinesSpy = spyOnDependency(mutations, 'addContextLines');

      mutations[types.ADD_CONTEXT_LINES](state, options);

      expect(findDiffFileSpy).toHaveBeenCalledWith(state.diffFiles, options.fileHash);
      expect(removeMatchLineSpy).toHaveBeenCalledWith(
        diffFile,
        options.lineNumbers,
        options.params.bottom,
      );

      expect(lineRefSpy).toHaveBeenCalledWith(
        options.contextLines,
        options.lineNumbers,
        options.params.bottom,
      );

      expect(addContextLinesSpy).toHaveBeenCalledWith({
        inlineLines: diffFile.highlighted_diff_lines,
        parallelLines: diffFile.parallel_diff_lines,
        contextLines: options.contextLines,
        bottom: options.params.bottom,
        lineNumbers: options.lineNumbers,
      });
    });
  });

  describe('ADD_COLLAPSED_DIFFS', () => {
    it('should update the state with the given data for the given file hash', () => {
      const fileHash = 123;
      const state = { diffFiles: [{}, { file_hash: fileHash, existing_field: 0 }] };
      const data = { diff_files: [{ file_hash: fileHash, extra_field: 1, existing_field: 1 }] };

      mutations[types.ADD_COLLAPSED_DIFFS](state, { file: state.diffFiles[1], data });

      expect(state.diffFiles[1].file_hash).toEqual(fileHash);
      expect(state.diffFiles[1].existing_field).toEqual(1);
      expect(state.diffFiles[1].extra_field).toEqual(1);
    });
  });

  describe('SET_LINE_DISCUSSIONS_FOR_FILE', () => {
    it('should add discussions to the given line', () => {
      const diffPosition = {
        base_sha: 'ed13df29948c41ba367caa757ab3ec4892509910',
        head_sha: 'b921914f9a834ac47e6fd9420f78db0f83559130',
        new_line: null,
        new_path: '500-lines-4.txt',
        old_line: 5,
        old_path: '500-lines-4.txt',
        start_sha: 'ed13df29948c41ba367caa757ab3ec4892509910',
      };

      const state = {
        latestDiff: true,
        diffFiles: [
          {
            file_hash: 'ABC',
            parallel_diff_lines: [
              {
                left: {
                  line_code: 'ABC_1',
                  discussions: [],
                },
                right: {
                  line_code: 'ABC_1',
                  discussions: [],
                },
              },
            ],
            highlighted_diff_lines: [
              {
                line_code: 'ABC_1',
                discussions: [],
              },
            ],
          },
        ],
      };
      const discussion = {
        id: 1,
        line_code: 'ABC_1',
        diff_discussion: true,
        resolvable: true,
        original_position: diffPosition,
        position: diffPosition,
        diff_file: {
          file_hash: state.diffFiles[0].file_hash,
        },
      };

      const diffPositionByLineCode = {
        ABC_1: diffPosition,
      };

      mutations[types.SET_LINE_DISCUSSIONS_FOR_FILE](state, {
        discussion,
        diffPositionByLineCode,
      });

      expect(state.diffFiles[0].parallel_diff_lines[0].left.discussions.length).toEqual(1);
      expect(state.diffFiles[0].parallel_diff_lines[0].left.discussions[0].id).toEqual(1);
      expect(state.diffFiles[0].parallel_diff_lines[0].right.discussions).toEqual([]);

      expect(state.diffFiles[0].highlighted_diff_lines[0].discussions.length).toEqual(1);
      expect(state.diffFiles[0].highlighted_diff_lines[0].discussions[0].id).toEqual(1);
    });

    it('should not duplicate discussions on line', () => {
      const diffPosition = {
        base_sha: 'ed13df29948c41ba367caa757ab3ec4892509910',
        head_sha: 'b921914f9a834ac47e6fd9420f78db0f83559130',
        new_line: null,
        new_path: '500-lines-4.txt',
        old_line: 5,
        old_path: '500-lines-4.txt',
        start_sha: 'ed13df29948c41ba367caa757ab3ec4892509910',
      };

      const state = {
        latestDiff: true,
        diffFiles: [
          {
            file_hash: 'ABC',
            parallel_diff_lines: [
              {
                left: {
                  line_code: 'ABC_1',
                  discussions: [],
                },
                right: {
                  line_code: 'ABC_1',
                  discussions: [],
                },
              },
            ],
            highlighted_diff_lines: [
              {
                line_code: 'ABC_1',
                discussions: [],
              },
            ],
          },
        ],
      };
      const discussion = {
        id: 1,
        line_code: 'ABC_1',
        diff_discussion: true,
        resolvable: true,
        original_position: diffPosition,
        position: diffPosition,
        diff_file: {
          file_hash: state.diffFiles[0].file_hash,
        },
      };

      const diffPositionByLineCode = {
        ABC_1: diffPosition,
      };

      mutations[types.SET_LINE_DISCUSSIONS_FOR_FILE](state, {
        discussion,
        diffPositionByLineCode,
      });

      expect(state.diffFiles[0].parallel_diff_lines[0].left.discussions.length).toEqual(1);
      expect(state.diffFiles[0].parallel_diff_lines[0].left.discussions[0].id).toEqual(1);
      expect(state.diffFiles[0].parallel_diff_lines[0].right.discussions).toEqual([]);

      expect(state.diffFiles[0].highlighted_diff_lines[0].discussions.length).toEqual(1);
      expect(state.diffFiles[0].highlighted_diff_lines[0].discussions[0].id).toEqual(1);

      mutations[types.SET_LINE_DISCUSSIONS_FOR_FILE](state, {
        discussion,
        diffPositionByLineCode,
      });

      expect(state.diffFiles[0].parallel_diff_lines[0].left.discussions.length).toEqual(1);
      expect(state.diffFiles[0].parallel_diff_lines[0].left.discussions[0].id).toEqual(1);
      expect(state.diffFiles[0].parallel_diff_lines[0].right.discussions).toEqual([]);

      expect(state.diffFiles[0].highlighted_diff_lines[0].discussions.length).toEqual(1);
      expect(state.diffFiles[0].highlighted_diff_lines[0].discussions[0].id).toEqual(1);
    });

    it('should add legacy discussions to the given line', () => {
      const diffPosition = {
        base_sha: 'ed13df29948c41ba367caa757ab3ec4892509910',
        head_sha: 'b921914f9a834ac47e6fd9420f78db0f83559130',
        new_line: null,
        new_path: '500-lines-4.txt',
        old_line: 5,
        old_path: '500-lines-4.txt',
        start_sha: 'ed13df29948c41ba367caa757ab3ec4892509910',
        line_code: 'ABC_1',
      };

      const state = {
        latestDiff: true,
        diffFiles: [
          {
            file_hash: 'ABC',
            parallel_diff_lines: [
              {
                left: {
                  line_code: 'ABC_1',
                  discussions: [],
                },
                right: {
                  line_code: 'ABC_1',
                  discussions: [],
                },
              },
            ],
            highlighted_diff_lines: [
              {
                line_code: 'ABC_1',
                discussions: [],
              },
            ],
          },
        ],
      };
      const discussion = {
        id: 1,
        line_code: 'ABC_1',
        diff_discussion: true,
        active: true,
        diff_file: {
          file_hash: state.diffFiles[0].file_hash,
        },
      };

      const diffPositionByLineCode = {
        ABC_1: diffPosition,
      };

      mutations[types.SET_LINE_DISCUSSIONS_FOR_FILE](state, {
        discussion,
        diffPositionByLineCode,
      });

      expect(state.diffFiles[0].parallel_diff_lines[0].left.discussions.length).toEqual(1);
      expect(state.diffFiles[0].parallel_diff_lines[0].left.discussions[0].id).toEqual(1);

      expect(state.diffFiles[0].highlighted_diff_lines[0].discussions.length).toEqual(1);
      expect(state.diffFiles[0].highlighted_diff_lines[0].discussions[0].id).toEqual(1);
    });
  });

  describe('REMOVE_LINE_DISCUSSIONS', () => {
    it('should remove the existing discussions on the given line', () => {
      const state = {
        diffFiles: [
          {
            file_hash: 'ABC',
            parallel_diff_lines: [
              {
                left: {
                  line_code: 'ABC_1',
                  discussions: [
                    {
                      id: 1,
                      line_code: 'ABC_1',
                    },
                    {
                      id: 2,
                      line_code: 'ABC_1',
                    },
                  ],
                },
                right: {
                  line_code: 'ABC_1',
                  discussions: [],
                },
              },
            ],
            highlighted_diff_lines: [
              {
                line_code: 'ABC_1',
                discussions: [
                  {
                    id: 1,
                    line_code: 'ABC_1',
                  },
                  {
                    id: 2,
                    line_code: 'ABC_1',
                  },
                ],
              },
            ],
          },
        ],
      };

      mutations[types.REMOVE_LINE_DISCUSSIONS_FOR_FILE](state, {
        fileHash: 'ABC',
        lineCode: 'ABC_1',
      });

      expect(state.diffFiles[0].parallel_diff_lines[0].left.discussions.length).toEqual(0);
      expect(state.diffFiles[0].highlighted_diff_lines[0].discussions.length).toEqual(0);
    });
  });

  describe('TOGGLE_FOLDER_OPEN', () => {
    it('toggles entry opened prop', () => {
      const state = {
        treeEntries: {
          path: {
            opened: false,
          },
        },
      };

      mutations[types.TOGGLE_FOLDER_OPEN](state, 'path');

      expect(state.treeEntries.path.opened).toBe(true);
    });
  });

  describe('TOGGLE_SHOW_TREE_LIST', () => {
    it('toggles showTreeList', () => {
      const state = createState();

      mutations[types.TOGGLE_SHOW_TREE_LIST](state);

      expect(state.showTreeList).toBe(false, 'Failed to toggle showTreeList to false');

      mutations[types.TOGGLE_SHOW_TREE_LIST](state);

      expect(state.showTreeList).toBe(true, 'Failed to toggle showTreeList to true');
    });
  });

  describe('UPDATE_CURRENT_DIFF_FILE_ID', () => {
    it('updates currentDiffFileId', () => {
      const state = createState();

      mutations[types.UPDATE_CURRENT_DIFF_FILE_ID](state, 'somefileid');

      expect(state.currentDiffFileId).toBe('somefileid');
    });
  });

  describe('Set highlighted row', () => {
    it('sets highlighted row', () => {
      const state = createState();

      mutations[types.SET_HIGHLIGHTED_ROW](state, 'ABC_123');

      expect(state.highlightedRow).toBe('ABC_123');
    });
  });

  describe('TOGGLE_LINE_HAS_FORM', () => {
    it('sets hasForm on lines', () => {
      const file = {
        file_hash: 'hash',
        parallel_diff_lines: [
          { left: { line_code: '123', hasForm: false }, right: {} },
          { left: {}, right: { line_code: '124', hasForm: false } },
        ],
        highlighted_diff_lines: [
          { line_code: '123', hasForm: false },
          { line_code: '124', hasForm: false },
        ],
      };
      const state = {
        diffFiles: [file],
      };

      mutations[types.TOGGLE_LINE_HAS_FORM](state, {
        lineCode: '123',
        hasForm: true,
        fileHash: 'hash',
      });

      expect(file.highlighted_diff_lines[0].hasForm).toBe(true);
      expect(file.highlighted_diff_lines[1].hasForm).toBe(false);

      expect(file.parallel_diff_lines[0].left.hasForm).toBe(true);
      expect(file.parallel_diff_lines[1].right.hasForm).toBe(false);
    });
  });
});
