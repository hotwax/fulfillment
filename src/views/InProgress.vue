<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>26 {{ $t("orders" )}} | 30 {{ $t("items") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <ion-searchbar />  

      <div class="filters">
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            John
            <p>2:30 PM</p>
          </ion-label>
          <ion-icon :icon="printOutline" />
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox slot="start"/>
          <ion-label>
            Aaron
            <p>2:04 PM</p>
          </ion-label>
          <ion-icon :icon="printOutline" />
        </ion-item>
      </div> 

      <ion-button expand="block" class="desktop-only" fill="outline" @click="packOrdersAlert">{{ $t("Pack orders") }}</ion-button>

      <ion-card>
        <div class="card-header">
          <div class="order-primary-info">
            <ion-label>
              Darooty Magwood
              <p>{{ $t("Ordered") }} 27th January 2020 9:24 PM EST</p>
            </ion-label>
          </div>

          <div class="order-tags">
            <ion-chip outline>
              <ion-icon :icon="pricetagOutline" />
              <ion-label>NN10584</ion-label>
            </ion-chip>
          </div>

          <div class="order-metadata">
            <ion-label>
              Next Day Shipping
              <p>{{ $t("Ordered") }} 28th January 2020 2:32 PM EST</p>
            </ion-label>
          </div>
        </div>

        <div class="box-type desktop-only">
          <ion-button fill="outline"><ion-icon :icon="addOutline" />{{ $t("Add Box") }}</ion-button>
          <ion-chip> Box A | Type 3</ion-chip>  
        </div>

        <div class="order-item">
          <div class="product-info">
            <ion-item lines="none">
              <ion-thumbnail>
                <img src="https://dev-resources.hotwax.io/resources/uploads/images/product/m/j/mj08-blue_main.jpg" />
              </ion-thumbnail>
              <ion-label>
                <p class="overline">WJ06-XL-PURPLE</p>
                Juno Jacket
                <p>Blue XL</p>
              </ion-label>
            </ion-item>
          </div>

          <div class="desktop-only">
              <ion-segment @ionChange="segmentChanged($event)" v-model="segment">
                <ion-segment-button value="pack">
                  <ion-label>{{ $t("Ready to pack") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="issue">
                  <ion-label>{{ $t("Report an issue") }}</ion-label>
                </ion-segment-button>
              </ion-segment> 
              <div class="segments">
              <div v-if="segment == 'pack'">
                <ion-item lines="none">
                  <ion-label>{{ $t("Select box") }}</ion-label>   
                  <ion-select value="box1">
                    <ion-select-option value="box1">Box A Type 3</ion-select-option>
                    <ion-select-option value="box2">Box B Type 2</ion-select-option>
                  </ion-select>      
                </ion-item>
              </div>
              <div v-if="segment == 'issue'">
                <ion-item lines="none">  
                  <ion-label>{{ $t("Select issue") }}</ion-label>  
                  <ion-select value="a">
                    <ion-select-option value="a">Out of stock</ion-select-option>
                    <ion-select-option value="b">Worn display</ion-select-option>
                  </ion-select> 
                </ion-item>
              </div>
            </div> 
          </div>

          <div class="product-metadata">
            <ion-note>49 {{ $t("pieces in stock") }}</ion-note>
          </div>
        </div>

        <div class="mobile-only">
          <ion-item>
            <ion-button fill="clear" @click="packOrdersAlert">{{ $t("Pack using default packaging") }}</ion-button>
            <ion-button slot="end" fill="clear" color="medium" @click="packagingPopover">
              <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
            </ion-button>
          </ion-item>
        </div>

        <div class="actions">  
          <div>
            <ion-button @click="reportIssueAlert">{{ $t("Pack") }}</ion-button>
             <ion-button fill="outline">{{ $t("Save") }}</ion-button>
          </div>
          <div></div>
        </div>
      </ion-card>

      <ion-fab class="mobile-only" vertical="bottom" horizontal="end">
        <ion-fab-button  @click="packOrdersAlert">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    <PackingSlipPdf v-show="false" />
  </ion-page>
</template>

<script>
import { IonButton, IonCard, IonCheckbox, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonItem, IonIcon, IonLabel, IonMenuButton, IonNote, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonThumbnail, IonTitle, IonToolbar, alertController, popoverController } from '@ionic/vue';
import { defineComponent, ref } from 'vue';
import { printOutline, addOutline, ellipsisVerticalOutline, checkmarkDoneOutline, pricetagOutline } from 'ionicons/icons'
import Popover from "@/views/PackagingPopover.vue";
import PackingSlipPdf from './PackingSlipPdf.vue';
import pdfMake from 'pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import htmlToPdfmake from 'html-to-pdfmake';

export default defineComponent({
  name: 'InProgress',
  components: {
    IonButton,  
    IonCard,
    IonCheckbox,
    IonChip,  
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonItem,
    IonIcon,
    IonLabel,
    IonMenuButton,
    IonNote,
    IonPage,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonThumbnail,   
    IonTitle,
    IonToolbar,
    PackingSlipPdf
  },
  methods: {
    segmentChanged(ev) {
      this.segment = ev.detail.value;
    },
    async packagingPopover(ev) {
      const popover = await popoverController.create({
        component: Popover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });
      return popover.present();
    },
    async packOrdersAlert() {
      const alert = await alertController
        .create({
          header: this.$t("Pack orders"),
          message: this.$t("You are packing orders. Select additional documents that you would like to print.", {count: 15, space: '<br /><br />'}),
          inputs: [
            {
              type: 'checkbox',
              label: this.$t("Shipping labels"),
              value: 'value1',
              checked: true,
              
            },
            {
              type: 'checkbox',
              label: this.$t("Packing slip"),
              value: 'value2',
            },
          ],   
          buttons: [
            {
              text: this.$t("Cancel"),
              handler: () => {
                console.log('Confirm Cancel')
              }
            },
            {
              text: this.$t("Pack"),
              handler: (event) => {
                if(event.includes('value2')){
                  this.generatePackingSlip();
                }
              }
            }
          ],
        });
      return alert.present();
    },
    async reportIssueAlert() {
      const alert = await alertController
        .create({
          header: this.$t("Report an Issue"),
          message: this.$t(", and other products are identified as unfulfillable. other orders  containing these products will be  unassigned  from this store and sent to be rebrokered.", {productName: "WJ06-XL-Purple", products: 5, space: '<br /><br />', orders: 4}),       
          buttons: [this.$t("Cancel"), this.$t("Report")],
        });
      return alert.present();
    },
    generatePackingSlip(){
      console.log("Packing slip will be generated")
      pdfMake.vfs = pdfFonts.pdfMake.vfs;
      const pdfDocument =  document.getElementById('PDF');
      let html;
      if(pdfDocument && pdfDocument.innerHTML !== null){
        html =  htmlToPdfmake(pdfDocument.innerHTML); 
      }
      const docDefinition = {
        content: [html],
        info: {
          title: 'PackingSlip'
        },
        styles:{
         'yellow':{
            background:'yellow' // it will add a yellow background to all elements with class yellow
          },
          'one':{
            background:'blue',
            color:'pink'
          }   
        } 
      }
      console.log(pdfMake)
      pdfMake.createPdf(docDefinition).open();
    }
  },
  setup() {
      const segment = ref("pack");

      return {
          addOutline,
          printOutline,
          ellipsisVerticalOutline,
          checkmarkDoneOutline,
          pricetagOutline,
          segment,
      }
  }
});
</script>

<style scoped>
.filters > ion-item {
  flex: 1 0 100%;
  max-width: 200px;
  border: 0.01px solid black;
  border-radius: 10px;
}

.order-primary-info {
  grid-area: info;
}

.order-tags {
  grid-area: tags;
  border-bottom: 1px solid black;
}

.order-metadata {
  grid-area: metadata;
  border-bottom: 1px solid black;
}

.card-header {
  display: grid;
  grid: "tags"
        "info"
        "metadata" / 1fr;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid black;
}  

@media (min-width: 991px) {
  .order-tags {
    border-bottom: none;
  }

  .order-metadata {
    text-align: end;
    border-bottom: none
  }

  .card-header {
    grid: "info tags metadata" / max-content 1fr max-content;
    justify-items: center;
    align-items: center;
    border-bottom: 1px solid black;
  }

  .box-type {
    border-bottom: 1px solid black;
  }
}
</style>