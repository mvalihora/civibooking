CRM.BookingApp.module('AddSubResource', function(AddSubResource, BookingApp, Backbone, Marionette, $, _) {

   CRM.BookingApp.vent.on("update:resources", function (model){
    $('#sub_resources').val(JSON.stringify(model.toJSON()));
   });

  CRM.BookingApp.vent.on("render:price", function (model){
    $("#total_price").val(model.attributes.total_price);
    $("#total-price-summary").text(model.attributes.total_price);
    $("#sub_total").val(model.attributes.sub_total);
    $("#sub-total-summary").text(model.attributes.sub_total);
    $('#adhoc_charge').val(model.attributes.adhoc_charges.total);
    $('#ad-hoc-charge-summary').html(model.attributes.adhoc_charges.total);
  });

  CRM.BookingApp.vent.on("render:options", function (options){
    var select = options.context.$el.find(options.element);
    if(select.is('[disabled]')){
      select.prop('disabled', false);
    }
    select.html(options.template({options: options.list, first_option: options.first_option}));
  });

  AddSubResource.ResourceTableView = Backbone.Marionette.ItemView.extend({
    template: '#resource-table-template',
    initialize: function(){
      if ($.trim($("#sub_resources").val())) {
        this.model.attributes = JSON.parse($.trim($("#sub_resources").val()));
      }
      this.model.attributes.total_price = $("#total_price").val();
      this.model.attributes.sub_total = $("#sub_total").val();
      //this.model.attributes.adhoc_charges = $("#adhoc_charge").val();
      this.model.attributes.discount_amount = $("#discount_amount").val();
    },
    onRender: function(){
      var self = this;
      //init the current price for each resource
      this.$el.find("span[id^='resource-price-']").each(function(){
        var el = $(this);
        self.model.attributes.resources[el.data('ref')] = el.text();
      });
      var items = [];
      var template = _.template($('#sub-resource-row-template').html());
      _.each(this.model.get('sub_resources'), function (item, key){
        self.$el.find("#crm-booking-sub-resource-table-" + item.parent_ref_id).append(template(item));
        items.push(item);
      });
      if($.trim($("#sub_resources").val())) {
        this.$el.find("span[id^='resource-total-price-']").each(function(){
          var el = $(this);
          var resourceTotalPrice = null;
          _.find(items, function (item) {
            if(item.parent_ref_id === el.data('ref')){
              resourceTotalPrice += parseFloat(item.price_estimate);
            }
          });
          if(resourceTotalPrice != null){
            el.text(resourceTotalPrice);
            self.$el.find('#crm-booking-sub-resource-row-' + el.data('ref')).show();
          }
        });
      }
      this.$el.find("#sub-total-summary").text(this.model.get("sub_total"));
      this.$el.find("#ad-hoc-charge-summary").text(this.model.get("adhoc_charges").total);
      this.$el.find("#discount_amount").text(this.model.get("discount_amount"));
      this.$el.find("#total-price-summary").text(this.model.get("total_price"));
    },
    events: {
      'click .add-sub-resource': 'addSubResource',
      'click .edit-adhoc-charge': 'editAdhocCharge',
      'click .collapsed' : 'toggleHiddenElement',
      'click .remove-sub-resource': 'removeSubResource',
      'keypress #discount_amount': 'addDiscountAmount',
      'keyup #discount_amount': 'addDiscountAmount',
      'keydown #discount_amount': 'addDiscountAmount',

    },
    addSubResource: function(e){
     var ref = $(e.currentTarget).data('ref');
     CRM.api('Resource', 'get', {'sequential': 1, 'is_unlimited': 1, 'is_deleted': 0, 'is_active': 1},
      {success: function(data) {
          var model = new CRM.BookingApp.Entities.AddSubResource({parent_ref_id:ref});
          var view = new AddSubResource.AddSubResourceModal({model: model, resources: data.values});
          view.title = ts('Add sub resource');
          CRM.BookingApp.modal.show(view);
        }
      }
    );
    },
    addDiscountAmount: function(e){
      console.log(this.model);
      var currentSubTotal = this.model.get('sub_total');
      var currentAdhocCharges = this.model.get('adhoc_charges');
      var discountAmount = $(e.currentTarget).val();
      var newToal = 0.0;
      if(CRM.BookingApp.Utils.isPositiveInteger(discountAmount)){
         newTotal = (parseFloat(currentSubTotal) + parseFloat(currentAdhocCharges.total))- discountAmount;
      }else{
         newTotal = (parseFloat(currentSubTotal) + parseFloat(currentAdhocCharges.total))- 0;
      }
      this.model.set("total_price", newTotal);
      CRM.BookingApp.vent.trigger('render:price', this.model );
    },
    editAdhocCharge: function(e){
      var model = new CRM.BookingApp.Entities.AdhocCharges({
        items: this.model.get('adhoc_charges').items,
        note: this.model.get('adhoc_charges').note,
        total: this.model.get('adhoc_charges').total
      });
      var view = new AddSubResource.EditAdhocChargesModal({model: model});
      view.title = ts('Edit ad-hoc charges');
      CRM.BookingApp.modal.show(view);
    },
    toggleHiddenElement: function(e){
      var row = $(e.currentTarget).data('ref');
      $('#crm-booking-sub-resource-row-' + row).toggle();
    },
    removeSubResource: function(e){
      var ref = $(e.currentTarget).data('ref');
      var parentRef = $(e.currentTarget).data('parent-ref');
      var price = $(e.currentTarget).data('price');
      $('#crm-booking-sub-resource-individual-row-' + ref).remove();
      delete this.model.attributes.sub_resources[ref];

      var newResourcePrice = parseFloat(this.model.get("resources")[parentRef]) - parseFloat(price);

      this.model.attributes.resources[parentRef] = newResourcePrice;
      var currentSubTotal = this.model.get('sub_total');
      var newSubTotal = parseFloat(this.model.get('sub_total') - parseFloat(price));
      var currentTotal = this.model.get('total_price');
      var newTotal = parseFloat(currentTotal) - parseFloat(price);

      this.model.set("sub_total",  newSubTotal);
      this.model.set("total_price", newTotal);

      CRM.BookingApp.vent.trigger('render:price', this.model , parentRef );
      CRM.BookingApp.vent.trigger('update:resources', this.model);
      CRM.alert(ts(''), ts('Sub resource removed'), 'success');

    }
  });

  AddSubResource.AddSubResourceModal = BookingApp.Common.Views.BookingProcessModal.extend({
    template: "#add-sub-resource-template",
    initialize: function(options){
      this.resources = options.resources;
    },
    events: {
      'click #add-to-basket': 'addSubResource',
      'change #resource_select': 'getConfigurations',
      'change #configuration_select': 'updatePriceEstmate',
      'keypress #quantity': 'updatePriceEstmate',
      'keyup #quantity': 'updatePriceEstmate',
      'keydown #quantity': 'updatePriceEstmate',

    },
    onRender: function(){
      BookingApp.Common.Views.BookingProcessModal.prototype.onRender.apply(this, arguments);

     var tpl = _.template($('#select-option-template').html());
      var params = {
        context:this,
        template: tpl,
        list:this.resources,
        element: "#resource_select",
        first_option: ['- ', ts('select resource'), ' -'].join("")
      }
      CRM.BookingApp.vent.trigger("render:options", params);


    },

     /**
     * Define form validation rules
     *
     * @param View view the view for which validation rules are created
     * @param Object r the validation rules for the view
     */
    onValidateRulesCreate: function(view, r) {
      _.extend(r.rules, {
        resource_select: {
          required: true
        },
        config_select: {
          required: true
        },
        time_required: {
          required: true
        },
        quantity: {
          required: true,
          number: true
        },
      });
    },

    updatePriceEstmate: function(e){
      var quantitySelector = this.$el.find('#quantity');
      if(e.type == 'change'){
        var configSelect = this.$el.find('#configuration_select');
        if(configSelect.val() !== ''){
          configSelect.find(':selected').data('price');
          var price = configSelect.find(':selected').data('price');
          this.model.set('configuration', {id: configSelect.val(), label:  configSelect.find(':selected').text(), price: price});
          quantitySelector.prop('disabled', false);
        }else{
          qualitySelector.prop('disabled', true);
          quantitySelector.val('');
        }
      }
      var configPrice = this.model.get('configuration').price
      var quantity = quantitySelector.val();
      if(CRM.BookingApp.Utils.isPositiveInteger(quantity)){
         var priceEstimate = quantity * configPrice;
        this.model.set('quantity', quantity);
        this.model.set('price_estimate', priceEstimate);
        this.$el.find('#price-estimate').html(priceEstimate);
      }
    },

    getConfigurations: function(e){
      selectedVal = $('#resource_select').val();
      if(selectedVal !== ""){
        var params = {
              id: selectedVal,
              sequential: 1,
              'api.resource_config_set.get': {
                id: '$value.set_id',
                'api.resource_config_option.get': {
                  set_id: '$value.id',
                  'api.option_group.get':{
                    name: 'booking_size_unit',
                  },
                  'api.option_value.get':{
                    value: '$value.unit_id',
                    option_group_id: '$value.api.option_group.get.id'
                  }
                }
              }
            };
        var self = this;
        CRM.api('Resource', 'get', params,
          { context: self,
            success: function(data) {
            var resource =  data['values']['0'];
            var options = data['values']['0']['api.resource_config_set.get']['values']['0']['api.resource_config_option.get']['values'];
            self.model.set('resource', {id: resource.id, label: resource.label});
            var params = {
              context:self,
              template: _.template($('#select-config-option-template').html()),
              list: options,
              element: "#configuration_select",
              first_option: '- ' + ts('select configuration') + ' -'
            }
            CRM.BookingApp.vent.trigger("render:options", params);

          }
        });
      }else{
        var params = {
          context:this,
          template: _.template($('#select-config-option-template').html()),
          list: new Array(),
          element: "#configuration_select",
          first_option: '- ' + ts('select configuration') + ' -'}
        CRM.BookingApp.vent.trigger("render:options", params);
        this.$el.find('#configuration_select').prop('disabled', true);
      }
    },
    addSubResource: function(e){
      e.preventDefault();
      if (!this.$('form').valid()) {
        var errors = this.$('form').validate().errors();
        this.onRenderError(errors);
        return false;
      }
      console.log(this.$el);
      this.model.set('note',this.$el.find('#sub-resource-note').val() );
      this.model.set('time_required',this.$el.find('#time_required').val() );

      var parentRefId = this.model.get('parent_ref_id');
      var refId = CRM.BookingApp.Utils.getCurrentUnixTimstamp();
      this.model.set('ref_id', refId);
      var template = _.template($('#sub-resource-row-template').html());
      $('#crm-booking-sub-resource-table-' + parentRefId).find('tbody').append(template(this.model.toJSON()));
      $('#crm-booking-sub-resource-row-' + parentRefId).show();
      var resourceRefId = this.model.get("parent_ref_id");
      var priceEstimate = this.model.get("price_estimate");

      var subResourceModel = CRM.BookingApp.main.currentView.model;
      subResourceModel.attributes.sub_resources[refId] = this.model.toJSON();

      var currentSubTotal = subResourceModel.get('sub_total');
      var newSubTotal = parseFloat(priceEstimate) + parseFloat(subResourceModel.get('sub_total'));
      subResourceModel.set("sub_total",  newSubTotal);

      var currentTotal = subResourceModel.get('total_price');
      var newTotal = (parseFloat(currentTotal) - parseFloat(currentSubTotal)) + parseFloat(newSubTotal);
      subResourceModel.set("total_price", newTotal);

      var currentResourceTotal = subResourceModel.get("resources")[resourceRefId];

      var resourceTotalPrice = parseFloat(currentResourceTotal) + parseFloat(priceEstimate);
      subResourceModel.attributes.resources[resourceRefId] = resourceTotalPrice;

      //set total price for resource tow
      $("#resource-total-price-" + resourceRefId).text(subResourceModel.attributes.resources[resourceRefId]);
      console.log(subResourceModel.attributes);
      CRM.BookingApp.vent.trigger('render:price', subResourceModel, resourceRefId );
      CRM.BookingApp.vent.trigger('update:resources', subResourceModel);
      CRM.BookingApp.modal.close(this);
    },

  });

  AddSubResource.EditAdhocChargesModal =BookingApp.Common.Views.BookingProcessModal.extend({
    template: "#edit-adhoc-charges-template",
    className: "modal-dialog",
    onRender: function(){
      console.log(this.model);
      var thisView = this;
      _.each(this.model.get('items'), function(item){
        thisView.$el.find('#' + item.name).html(item.item_price);
        thisView.$el.find('input[name="' + item.name + '"]').val(item.quantity);
      });
      this.$el.find('#adhoc-charges-note').val(this.model.get('note'));
      this.$el.find('#total-adhoc-charges').html(this.model.get('total'));
      BookingApp.Common.Views.BookingProcessModal.prototype.onRender.apply(this, arguments);
    },
    events: {
      'keypress .item': 'updatePrice',
      'keyup .item': 'updatePrice',
      'keydown .item': 'updatePrice',
      'click #update-adhoc-charges': 'updateAdhocCharges',
    },
    updatePrice: function(e){
      var el = $(e.currentTarget);
      var itemId = el.data('id');
      var price = el.data('price');
      var quantity = el.val();
      var name = el.attr('name');
      if(CRM.BookingApp.Utils.isPositiveInteger(quantity)){
        var itemPrice = parseFloat(price) * parseFloat(quantity);
        this.$el.find('#'+ name).html(parseFloat(itemPrice).toFixed(2));
        var item = {id: itemId, name: name, price: price, quantity: quantity, item_price: itemPrice}
        this.model.attributes.items[itemId] = item;
      }else{
        this.$el.find('#'+ name).html(0);
        this.$el.find('input[name="'+ name + '"]').val('');
         delete this.model.attributes.items[itemId];
      }
      var items = this.model.get('items');
      var total = 0.0;
      _.each(items,function(item){
       total = parseFloat(total) +  parseFloat(item.item_price);
      });
      this.$el.find('#total-adhoc-charges').html(total);
      this.model.set('total', total);
    },
    updateAdhocCharges: function(e){
      e.preventDefault();
      var subResourceModel = CRM.BookingApp.main.currentView.model;
      this.model.set('note',this.$el.find('#adhoc-charges-note').val() );
      var adhocChargesTotal = this.model.get('total');
      //console.log(adhocChargesTotal);
      subResourceModel.set('adhoc_charges', this.model.attributes);
      var currentTotal = subResourceModel.get('total_price');
      var newTotal = parseFloat(adhocChargesTotal) + parseFloat(currentTotal);
      subResourceModel.set("total_price", parseFloat(newTotal));
      CRM.BookingApp.vent.trigger('render:price', subResourceModel);
      CRM.BookingApp.vent.trigger('update:resources', subResourceModel);
      console.log(subResourceModel.attributes);
      CRM.BookingApp.modal.close(this);
    }

  });

});
