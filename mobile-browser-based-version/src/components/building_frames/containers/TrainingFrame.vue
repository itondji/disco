<template>
  <action-frame :Task="Task">
    <template v-slot:dataExample><slot name="dataExample"></slot></template>
    <template v-slot:action>
      <!-- Upload Training Data -->
      <div class="relative">
        <uploading-frame
          v-bind:Id="Id"
          v-bind:Task="Task"
          v-bind:fileUploadManager="fileUploadManager"
          v-if="fileUploadManager"
        />
      </div>

      <slot name="extra"></slot>

      <!-- Train Button -->
      <div class="flex items-center justify-center p-4">
        <custom-button v-on:click="joinTraining(false)" :center="true">
          Train Alone
        </custom-button>
        <custom-button v-on:click="joinTraining(true)" :center="true">
          Train {{ this.$t("platform") }}
        </custom-button>
      </div>
      <!-- Training Board -->
      <div>
        <training-information-frame
          v-bind:trainingInformant="trainingInformant"
          v-if="trainingInformant"
        />
      </div>

      <!-- Save the model button -->
      <icon-card
        header="Save the model"
        description="If you are satisifed with the performance of the model, don't
            forget to save the model by clicking on the button below. The next
            time you will load the application, you will be able to use your
            saved model."
      >
        <template v-slot:icon><download /></template>
        <template v-slot:extra
          ><div class="flex items-center justify-center p-4">
            <!-- make it gray & unclickable if indexeddb is turned off -->
            <custom-button
              id="train-model-button"
              v-on:click="saveModelButton()"
              :center="true"
            >
              Save My model
            </custom-button>
          </div></template
        >
      </icon-card>
      <!-- Test the model button -->
      <icon-card
        header="Test the model"
        description="Once you have finished training your model it might be a great idea
            to go test it."
      >
        <template v-slot:icon><download /></template>
        <template v-slot:extra>
          <!-- Descrition -->
          <div class="relative p-4 overflow-x-hidden">
            <span
              style="white-space: pre-line"
              class="text-sm text-gray-500 dark:text-light"
            >
            </span>
          </div>
          <div class="flex items-center justify-center p-4">
            <custom-button
              id="train-model-button"
              v-on:click="goToTesting()"
              :center="true"
            >
              Test the model
            </custom-button>
          </div>
        </template>
      </icon-card>
    </template>
  </action-frame>
</template>

<script>
import UploadingFrame from "../upload/UploadingFrame.vue";
import TrainingInformationFrame from "../TrainingInformationFrame.vue";
import ActionFrame from "./ActionFrame.vue";
import IconCard from "../../containers/IconCard.vue";
import CustomButton from "../../simple/CustomButton.vue";
import Download from "../../../assets/svg/Download.vue";

import { saveWorkingModel } from "../../../helpers/memory/helpers";
import { TrainingSetup } from "../../../helpers/training/training_setup";
import { mapState } from "vuex";

export default {
  name: "TrainingFrame",
  props: {
    Id: String,
    Task: Object,
    dataPreprocessing: Function,
    precheckData: Function,
    nbrClasses: Number,
  },
  components: {
    UploadingFrame,
    TrainingInformationFrame,
    ActionFrame,
    IconCard,
    CustomButton,
    Download,
  },
  computed: {
    ...mapState(['useIndexedDB']),
  },
  watch: {
    useIndexedDB(newValue) {
      this.trainingManager.setIndexedDB(newValue);
    },
  },
  data() {
    return {
      trainingSetup: new TrainingSetup(
        this.Task,
        this.$store.getters.platform,
        this.useIndexedDB,
        () => this.$toast
      ),
    };
  },
  computed: {
    ...mapState(["useIndexedDB"]),
  },
  watch: {
    useIndexedDB(newValue) {
      this.trainingSetup.setIndexedDB(newValue);
    },
  },
  methods: {
    goToTesting() {
      this.$router.push({
        path: "testing",
      });
    },
    async saveModelButton() {
      if (this.useIndexedDB) {
        await saveWorkingModel(
          this.Task.taskID,
          this.Task.trainingInformation.modelID
        );
        this.$toast.success(
          `The current ${this.Task.displayInformation.taskTitle} model has been saved.`
        );
      } else {
        this.$toast.error(
          "The model library is currently turned off. See settings for more information"
        );
      }
    },
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(this.trainingSetup.connect);
  },
  async unmounted() {
    this.trainingSetup.disconnect();
  },
};
</script>