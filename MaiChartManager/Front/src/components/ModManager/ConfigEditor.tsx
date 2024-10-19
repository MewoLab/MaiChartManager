import { computed, defineComponent, onMounted, PropType, ref, watch } from "vue";
import { NButton, NCheckbox, NDivider, NFlex, NFormItem, NInput, NInputNumber, NModal, NScrollbar, NSelect, NSwitch, useDialog } from "naive-ui";
import { Config, GameEdition, GameModInfo } from "@/client/apiGen";
import comments from './modComments.yaml';
import api from "@/client/api";
import { capitalCase } from "change-case";
import ProblemsDisplay from "@/components/ProblemsDisplay";
import { globalCapture } from "@/store/refs";
import TouchSensitivityConfigurator from "@/components/ModManager/TouchSensitivityConfigurator";
import CustomKeyBindingConfig from "@/components/ModManager/CustomKeyBindingConfig";

export default defineComponent({
  props: {
    show: Boolean,
    disableBadge: Boolean,
    info: {type: Object as PropType<GameModInfo>, required: true},
    refresh: {type: Function, required: true},
    badgeType: String,
  },
  setup(props, {emit}) {
    const show = computed({
      get: () => props.show,
      set: (val) => emit('update:show', val)
    })
    const disableBadge = computed({
      get: () => props.disableBadge,
      set: (val) => emit('update:disableBadge', val)
    })

    const config = ref<Config>()
    const dialog = useDialog()
    const installingMelonLoader = ref(false)
    const installingAquaMai = ref(false)
    const showAquaMaiInstallDone = ref(false)

    onMounted(async () => {
      config.value = (await api.GetAquaMaiConfig()).data;
    })

    const installMelonLoader = async () => {
      try {
        installingMelonLoader.value = true
        await api.InstallMelonLoader()
        await props.refresh()
      } catch (e: any) {
        globalCapture(e, "安装 MelonLoader 失败")
      } finally {
        installingMelonLoader.value = false
      }
    }

    const installAquaMai = async () => {
      try {
        // 但是你根本看不到这个加载图标，因为太快了
        installingAquaMai.value = true
        await api.InstallAquaMai()
        await props.refresh()
        showAquaMaiInstallDone.value = true
        setTimeout(() => showAquaMaiInstallDone.value = false, 3000);
      } catch (e: any) {
        globalCapture(e, "安装 AquaMai 失败，文件可能被占用了？")
      } finally {
        installingAquaMai.value = false
      }
    }

    watch(() => show.value, async (val) => {
      if (!val && config.value) {
        try {
          await api.SetAquaMaiConfig(config.value)
        } catch (e) {
          globalCapture(e, "保存 AquaMai 配置失败")
        }
      }
    })

    return () => <NModal
      preset="card"
      class="w-[min(90vw,70em)]"
      title="Mod 管理"
      v-model:show={show.value}
    >
      <NFlex vertical>
        <NFlex align="center">
          MelonLoader:
          {props.info.melonLoaderInstalled ? <span class="c-green-6">已安装</span> : <span class="c-red-6">未安装</span>}
          {!props.info.melonLoaderInstalled && <NButton secondary loading={installingMelonLoader.value} onClick={installMelonLoader}>安装</NButton>}
          <div class="w-8"/>
          AquaMai:
          {props.info.aquaMaiInstalled ?
            props.info.aquaMaiVersion === props.info.bundledAquaMaiVersion ? <span class="c-green-6">已安装</span> : <span class="c-orange">可更新</span> :
            <span class="c-red-6">未安装</span>}
          <NButton secondary loading={installingAquaMai.value} onClick={() => installAquaMai()}
                   type={showAquaMaiInstallDone.value ? 'success' : 'default'}>
            {showAquaMaiInstallDone.value ? <span class="i-material-symbols-done"/> : props.info.aquaMaiInstalled ? '重新安装 / 更新' : '安装'}
          </NButton>
          已安装:
          <span>{props.info.aquaMaiVersion}</span>
          可安装:
          <span class={props.info.aquaMaiVersion === props.info.bundledAquaMaiVersion ? "" : "c-orange"}>{props.info.bundledAquaMaiVersion}</span>
        </NFlex>
        {props.badgeType && <NCheckbox v-model:checked={disableBadge.value}>隐藏按钮上的角标</NCheckbox>}
        {config.value && <NScrollbar class="max-h-60vh p-2">
          {Object.entries(config.value).map(([key, section]) => !!section && <>
              <NDivider titlePlacement="left" key={key}>{comments.sections[key]}</NDivider>
            {key === 'touchSensitivity' ?
              <TouchSensitivityConfigurator config={section}/>
              : key === 'customKeyMap' ?
                <CustomKeyBindingConfig config={section}/>
                :
                Object.keys(section).map((k) => <NFormItem key={k} label={capitalCase(k)} labelPlacement="left" labelWidth="10em">
                  <NFlex vertical class="w-full ws-pre-line">
                    <NFlex class="h-34px" align="center">
                      {(() => {
                        const choices = comments.options[key]?.[k]
                        if (choices) {
                          return <NSelect v-model:value={section[k]} options={choices} clearable/>
                        }
                        return <>
                          {typeof section[k] === 'boolean' && <NSwitch v-model:value={section[k]}/>}
                          {typeof section[k] === 'string' && <NInput v-model:value={section[k]} placeholder="" onUpdateValue={v => section[k] = typeof v === 'string' ? v : ''}/>}
                          {typeof section[k] === 'number' && <NInputNumber value={section[k]} onUpdateValue={v => section[k] = typeof v === 'number' ? v : 0} placeholder="" step={comments.steps[k] || 1}/>}
                        </>
                      })()}
                      {comments.shouldEnableOptions[key]?.[k] && !section[k] && <ProblemsDisplay problems={['需要开启此选项']}/>}
                    </NFlex>
                    {comments[key]?.[k]}
                  </NFlex>
                </NFormItem>)
            }
          </>)}
        </NScrollbar>}
      </NFlex>
    </NModal>;
  }
})
