<template>
  <base-layout v-bind:withSection="true">
    <!-- Form definition -->
    <vee-form v-slot="{ errors }" :validation-schema="schema">
      <form @submit="onSubmit">
        <div class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1">
          <div v-for="formSection in formSections" :key="formSection.id">
            <title-card :title="formSection.title">
              <div class="space-y-4">
                <div v-for="field in allFields(formSection)" :key="field.id">
                  <custom-label :field="field" />

                  <custom-select
                    v-if="field.type == 'select' && field.id == 'dataType'"
                    v-model="dataType"
                    :field="field"
                  />
                  <custom-select
                    v-else-if="field.type == 'select' && field.id != 'dataType'"
                    :field="field"
                  />
                  <custom-select-multiple
                    v-else-if="field.type == 'select-multiple'"
                    :field="field"
                  />
                  <!-- select file button -->
                  <custom-file-input
                    v-else-if="field.type == 'file'"
                    :field="field"
                  />

                  <custom-field-array
                    v-else-if="field.type == 'array'"
                    :field="field"
                  />

                  <custom-field-array-object
                    v-else-if="field.type == 'arrayObject'"
                    :field="field"
                  />

                  <custom-field v-else :field="field" />

                  <ErrorMessage class="text-red-600" v-bind:name="field.id" />
                  <span>{{ errors.field }}</span>
                </div>
              </div>
            </title-card>
          </div>
          <!-- Submit button -->
          <div class="w-auto flex space-x-4">
            <button type="submit" :class="'w-1/6' + buttonStyle">Submit</button>
            <button
              type="reset"
              ref="resetButton"
              value="Reset"
              :class="'w-1/6' + buttonStyle"
            >
              Reset
            </button>
            <a
              href="https://join.slack.com/t/deai-workspace/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw"
              :class="'w-2/5' + buttonStyle"
            >
              Request Help on Slack
            </a>
          </div>
        </div>
      </form>
    </vee-form>
  </base-layout>
</template>

<script>
// WARNING: temporay code until serialization of Task object
// Import the tasks objects Here
import { mapMutations } from 'vuex';
import sections from '../task_definition/form.config.js';

import TitleCard from './containers/TitleCard.vue';
import BaseLayout from './containers/BaseLayout.vue';
import CustomLabel from './simple/form/CustomLabel.vue';
import CustomSelect from './simple/form/CustomSelect.vue';
import CustomSelectMultiple from './simple/form/CustomSelectMultiple.vue';
import CustomFileInput from './simple/form/CustomFileInput.vue';
import CustomFieldArray from './simple/form/CustomFieldArray.vue';
import CustomFieldArrayObject from './simple/form/CustomFieldArrayObject.vue';
import CustomField from './simple/form/CustomField.vue';

import axios from 'axios';
import _ from 'lodash';

import {
  Form as VeeForm,
  ErrorMessage,
  handleSubmit,
  useForm,
} from 'vee-validate';
import * as yup from 'yup';

export default {
  name: 'NewTaskCreationForm',
  components: {
    BaseLayout,
    TitleCard,
    VeeForm,
    ErrorMessage,
    CustomLabel,
    CustomSelect,
    CustomSelectMultiple,
    CustomFileInput,
    CustomFieldArray,
    CustomFieldArrayObject,
    CustomField,
  },
  data() {
    // data property defining which task-specific fields should be rendered
    const dataType = 'csv';
    const formSections = sections;
    // validation schema used by the yup package
    let schemaData = {};
    _.forEach(formSections, (s) =>
      _.forEach(
        s.fields,
        // explicit yup schema
        (f) => {
          // only validate fields with a yup property (not valid for files)
          if (f.yup) schemaData[f.id] = f.yup.label(f.name);
        } //render name instead of id in error message
      )
    );
    const schema = yup.object(schemaData);
    return {
      dataType,
      formSections,
      schema,
    };
  },
  setup() {
    const buttonStyle =
      'text-lg border-2 border-transparent bg-green-500 ml-9 py-2 px-4 p font-bold uppercase text-white rounded transform transition motion-reduce:transform-none duration-500 focus:outline-none';
    const { handleSubmit } = useForm();

    function onInvalidSubmit({ values, errors, results }) {
      console.log(values); // current form values
      console.log(errors); // a map of field names and their first error message
      console.log(results); // a detailed map of field names and their validation results
    }

    const onSubmitAsync = async (rawTask, { resetForm }) => {
      console.log('*****************');
      // load model.json file provided by user
      function filePromise(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const response = await axios.get(reader.result);
            resolve(response.data);
          };
          reader.readAsDataURL(file);
        });
      }

      console.log('*****************');
      console.log(rawTask.weightsFile);
      console.log(rawTask.modelFile);
      const files = await Promise.all([
        filePromise(rawTask.modelFile[0]),
        filePromise(rawTask.weightsFile[0]),
      ]);
      // replace content of the form by the modelFile loaded
      rawTask.modelFile = files[0];
      rawTask.weightsFile = files[1];
      const task = this.formatTaskForServer(rawTask);
      // Submit values to Express server
      const response = await axios.post(
        `http://localhost:8080/${this.$store.getters.platform}/tasks/`,
        task
      );
      if (response.status === 200) {
        resetForm();
        await this.onSubmissionSucess(task);
        this.$toast.success(
          `Task ${task.taskID} successfully uploaded on the platform`
        );
      } else {
        this.$toast.error(
          `Failed to upload Task ${task.taskID} on the platform`
        );
      }
      setTimeout(this.$toast.clear, 30000);
    };
    const onSubmit = handleSubmit(onSubmitAsync, onInvalidSubmit);
    return {
      onSubmit,
      buttonStyle,
    };
  },
  methods: {
    ...mapMutations(['addNewTask', 'setActivePage']),
    allFields(formSection) {
      return _.concat(formSection.fields, formSection[this.dataType]);
    },
    formatTaskForServer(task) {
      //task should have a json format structure as in `tasks.json` to be correctly uploaded on server
      const formated = { taskID: task.taskID };
      _.forEach(this.formSections, (section) => {
        return (formated[section.id] = _.reduce(
          section.fields,
          (acc, field) => {
            acc[field.id] =
              field.type === 'number' ? Number(task[field.id]) : task[field.id];
            return acc;
          },
          {}
        ));
      });
      formated.trainingInformation['modelCompileData'] = _.cloneDeep(
        formated.modelCompileData
      );
      formated.trainingInformation['dataType'] = task.dataType;
      formated.trainingInformation.modelTrainData = _.reduce(
        task.modelTrainData,
        (acc, f) => {
          acc[f.trainingParameter] = f.value;
          return acc;
        },
        {}
      );
      _.unset(formated, 'modelCompileData');
      _.unset(formated, 'generalInformation');
      return formated;
    },
    async onSubmissionSucess(task) {
      // manual reset of form
      this.$refs.resetButton.click();
      // add task to store to rerender TaskList component
      this.addNewTask(task);
      // got to home component
      this.goToHome();
    },
    goToHome() {
      this.setActivePage('home');
      this.$router.push({
        path: '/',
      });
    },
  },
};
</script>
