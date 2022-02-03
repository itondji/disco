<template>
  <div>
    <label
      class="
        inline
        text-gray-500
        font-bold
        md:text-right
        mb-1
        md:mb-0
        pr-4
        dark:text-white
      "
      v-bind:for="field.id"
    >
      {{ field.name }}
    </label>
  </div>
</template>

<script>
export default {
  name: 'custom-label',
  props: ['field'],
};
</script>
