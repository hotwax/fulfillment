<template>
  <img :src="imageUrl"/>
</template>

<script setup lang="ts">
import { defineProps, onMounted, ref, watch } from "vue";
import logger from "@/logger";
import defaultImage from "@/assets/images/defaultImage.png";

const props = defineProps(["src"]);

const resourceUrl = ref("");
const imageUrl = ref(defaultImage);

const checkIfImageExists = (src: string) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function () {
      resolve(true);
    };
    img.onerror = function () {
      reject(false);
    };
    img.src = src;
  });
};

const setImageUrl = () => {
  if (props.src) {
    if (props.src.indexOf("assets/") != -1) {
      imageUrl.value = props.src;
    } else if (props.src.startsWith("http")) {
      checkIfImageExists(props.src).then(() => {
        imageUrl.value = props.src;
      }).catch(() => {
        logger.error("Image doesn't exist", props.src);
      });
    } else {
      const url = resourceUrl.value.concat(props.src);
      checkIfImageExists(url).then(() => {
        imageUrl.value = url;
      }).catch(() => {
        logger.error("Image doesn't exist", url);
      });
    }
  }
};

onMounted(() => {
  if (process.env.VUE_APP_RESOURCE_URL) {
    resourceUrl.value = process.env.VUE_APP_RESOURCE_URL;
  }
  setImageUrl();
});

watch(() => props.src, () => {
  setImageUrl();
});
</script>
