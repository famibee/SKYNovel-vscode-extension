<template>
<div v-if="err" class="alert alert-danger" role="alert" v-html="err"></div>

<div v-else class="row">
<Form v-for="({id, lbl, type, num, max, min, step}, i) in aTemp" :key="i" v-slot="{meta}" class="col-6 col-sm-3 px-1 pb-2">
	<div v-if="type === 'chk'" class="form-check">
		<input type="checkbox" v-model="aTemp[i].bol" v-bind="{id}" class="form-check-input mb-3 sn_checkbox"/>
		<label class="form-check-label" :for="id" v-text="lbl"></label>
	</div>
	<div v-else-if="type === 'rng'" class="range-wrap">
		<div class="range-badge range-badge-down" :style="{left: getLeftRangeBadge(num, max, min)}">
			<span v-text="aTemp[i].num"></span>
		</div>
		<label :for="id" class="form-label" v-text="lbl"></label>
		<input type="range" v-model="aTemp[i].num" v-bind="{id, max, min, step}" class="form-range my-1"/>
	</div>
	<div v-else :class="{'was-validated': meta.valid}">
		<label :for="id" class="form-label" v-text="lbl"></label>
		<Field v-model="aTemp[i].val" v-bind="{id, name: id, type: type === 'num' ?'number' :'text', placeholder: lbl}" class="form-control form-control-sm" :class="{'is-invalid': !meta.valid}" :rules="isRequired"/>
		<ErrorMessage :name="id" class="invalid-feedback"/>
	</div>
</Form>
</div>

</template>


<script setup lang="ts">
import {useTemp} from '../store/stTemp';
import {storeToRefs} from 'pinia';
import {Field, Form, ErrorMessage, configure} from 'vee-validate';
import {getLeftRangeBadge} from '../store/stVSCode';

configure({
	validateOnBlur		: true,
	validateOnChange	: true,
	validateOnInput		: true,	// false,
	validateOnModelUpdate	: true,
});

const stTemp = useTemp();
const {aTemp, err} = storeToRefs(stTemp);	// 分割代入

const isRequired = (value: any)=> {
	return value ? true : 'This field is required';
};

</script>