<template>
  <div>
    <vee-field
      v-bind:name="field.id"
      v-bind:id="field.id"
      v-slot="{ handleChange, handleBlur }"
    >
      <input
        type="file"
        v-bind:accept="field.extension"
        @change="handleChange"
        @blur="handleBlur"
      />
    </vee-field>
    <div class="flex justify-between items-center text-gray-400">
      <span>Accepted file type: {{ field.extension }} only</span>
      <span class="flex items-center"
        ><i class="fa fa-lock mr-1"></i> secure</span
      >
    </div>
    <ErrorMessage class="text-red-600" v-bind:name="field.id" />
  </div>
</template>

<script>
import { Field as VeeField, ErrorMessage } from 'vee-validate';
export default {
  name: 'custom-file-input',
  props: ['field'],
  components: {
    VeeField,
    ErrorMessage,
  },
};
</script>
