import { computed, defineComponent, ref } from "vue";
import api from "@/client/api";
import { globalCapture, selectedADir, selectedMusicBrief, selectMusicId, showNeedPurchaseDialog, updateMusicList, version } from "@/store/refs";
import { NButton, NButtonGroup, NDropdown, useDialog, useMessage } from "naive-ui";
import { ZipReader } from "@zip.js/zip.js";
import ChangeIdDialog from "./ChangeIdDialog";

const getSubDirFile = async (folderHandle: FileSystemDirectoryHandle, fileName: string) => {
  const pathParts = fileName.split('/');

  let dirHandle = folderHandle;
  for (let i = 0; i < pathParts.length - 1; i++) {
    dirHandle = await dirHandle.getDirectoryHandle(pathParts[i], {create: true});
  }
  return await dirHandle.getFileHandle(pathParts[pathParts.length - 1], {create: true});
}

enum DROPDOWN_OPTIONS {
  export,
  exportZip,
  changeId,
  showExplorer,
  exportMaidata,
  exportMaiDataZip,
}

export default defineComponent({
  setup() {
    const wait = ref(false);
    const dialog = useDialog();
    const message = useMessage();
    const showChangeId = ref(false);

    const options = computed(() => [
      {
        label: () => <a href={`/MaiChartManagerServlet/ExportOptApi/${selectMusicId.value}`} download={`${selectMusicId.value} - ${selectedMusicBrief.value?.name}.zip`}>导出 Zip</a>,
        key: DROPDOWN_OPTIONS.exportZip,
      },
      {
        label: '导出为 Maidata',
        key: DROPDOWN_OPTIONS.exportMaidata,
      },
      {
        label: () => <a href={`/MaiChartManagerServlet/ExportAsMaidataApi/${selectMusicId.value}`} download={`${selectMusicId.value} - ${selectedMusicBrief.value?.name} - Maidata.zip`}>导出 Zip (Maidata)</a>,
        key: DROPDOWN_OPTIONS.exportMaiDataZip,
      },
      ...(selectedADir.value === 'A000' ? [] : [{
        label: '修改 ID',
        key: DROPDOWN_OPTIONS.changeId,
      }]),
      {
        label: '在资源管理器中显示',
        key: DROPDOWN_OPTIONS.showExplorer,
      }
    ])

    const handleOptionClick = (key: DROPDOWN_OPTIONS) => {
      switch (key) {
        case DROPDOWN_OPTIONS.changeId:
          if (version.value?.license !== 'Active') {
            showNeedPurchaseDialog.value = true
            return
          }
          showChangeId.value = true;
          break;
        case DROPDOWN_OPTIONS.showExplorer:
          api.RequestOpenExplorer(selectMusicId.value);
          break;
        case DROPDOWN_OPTIONS.exportMaidata:
          copy(key);
          break;
      }
    }

    const copy = async (type: DROPDOWN_OPTIONS) => {
      wait.value = true;
      if (location.hostname !== '127.0.0.1' || type === DROPDOWN_OPTIONS.exportMaidata) {
        // 浏览器模式，使用 zip.js 获取并解压
        let folderHandle: FileSystemDirectoryHandle;
        try {
          folderHandle = await window.showDirectoryPicker({
            id: 'copyToSaveDir',
            mode: 'readwrite'
          });
        } catch (e) {
          wait.value = false;
          console.log(e)
          return;
        }
        try {
          const zip = await fetch(`/MaiChartManagerServlet/${type === DROPDOWN_OPTIONS.exportMaidata ? 'ExportAsMaidataApi' : 'ExportOptApi'}/${selectMusicId.value}`)
          const zipReader = new ZipReader(zip.body!);
          const entries = zipReader.getEntriesGenerator();
          for await (const entry of entries) {
            console.log(entry.filename);
            if (entry.filename.endsWith('/')) {
              continue;
            }
            const fileHandle = await getSubDirFile(folderHandle, entry.filename);
            const writable = await fileHandle.createWritable();
            await entry.getData!(writable);
          }
          message.success('成功');
        } catch (e) {
          globalCapture(e, "导出歌曲失败（远程）")
        } finally {
          wait.value = false;
        }
        return;
      }
      try {
        // 本地 webview 打开，使用本地模式
        await api.RequestCopyTo(selectMusicId.value);
      } finally {
        wait.value = false;
      }
    }

    return () =>
      <NButtonGroup>
        <NButton secondary onClick={() => copy(DROPDOWN_OPTIONS.export)} loading={wait.value}>
          复制到...
        </NButton>
        <NDropdown options={options.value} trigger="click" placement="bottom-end" onSelect={handleOptionClick}>
          <NButton secondary class="px-.5 b-l b-l-solid b-l-[rgba(255,255,255,0.5)]">
            <span class="i-mdi-arrow-down-drop text-6 translate-y-.25"/>
          </NButton>
        </NDropdown>
        <ChangeIdDialog v-model:show={showChangeId.value}/>
      </NButtonGroup>
  }
});