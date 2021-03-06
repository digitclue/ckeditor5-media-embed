/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module media-embed/mediaembedui
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import { createDropdown } from '@ckeditor/ckeditor5-ui/src/dropdown/utils';
import MediaFormView from './ui/mediaformview';
import MediaEmbedEditing from './mediaembedediting';
import mediaIcon from '../theme/icons/media.svg';

/**
 * The media embed UI plugin.
 *
 * @extends module:core/plugin~Plugin
 */
export default class MediaEmbedUI extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ MediaEmbedEditing ];
	}

	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;
		const command = editor.commands.get( 'mediaEmbed' );
		const mediaRegistry = editor.plugins.get( MediaEmbedEditing ).mediaRegistry;

		// Setup `imageUpload` button.
		editor.ui.componentFactory.add( 'mediaEmbed', locale => {
			const form = new MediaFormView( getFormValidators( editor.t, mediaRegistry ), locale );
			const dropdown = createDropdown( locale );

			this._setUpDropdown( dropdown, form, command, editor );
			this._setUpForm( form, dropdown, command );

			return dropdown;
		} );
	}

	_setUpDropdown( dropdown, form, command ) {
		const editor = this.editor;
		const t = editor.t;
		const button = dropdown.buttonView;

		dropdown.bind( 'isEnabled' ).to( command );
		dropdown.panelView.children.add( form );

		button.set( {
			label: t( 'Insert media' ),
			icon: mediaIcon,
			tooltip: true
		} );

		// Note: Use the low priority to make sure the following listener starts working after the
		// default action of the drop-down is executed (i.e. the panel showed up). Otherwise, the
		// invisible form/input cannot be focused/selected.
		button.on( 'open', () => {
			// Make sure that each time the panel shows up, the URL field remains in sync with the value of
			// the command. If the user typed in the input, then canceled (`urlInputView#value` stays
			// unaltered) and re-opened it without changing the value of the media command (e.g. because they
			// didn't change the selection), they would see the old value instead of the actual value of the
			// command.
			form.url = command.value || '';
			form.urlInputView.select();
			form.focus();
		}, { priority: 'low' } );

		dropdown.on( 'submit', () => {
			if ( form.isValid() ) {
				editor.execute( 'mediaEmbed', form.url );
				closeUI();
			}
		} );

		dropdown.on( 'change:isOpen', () => form.resetErrors() );
		dropdown.on( 'cancel', () => closeUI() );

		function closeUI() {
			editor.editing.view.focus();
			dropdown.isOpen = false;
		}
	}

	_setUpForm( form, dropdown, command ) {
		form.delegate( 'submit', 'cancel' ).to( dropdown );
		form.urlInputView.bind( 'value' ).to( command, 'value' );

		// Form elements should be read-only when corresponding commands are disabled.
		form.urlInputView.bind( 'isReadOnly' ).to( command, 'isEnabled', value => !value );
		form.saveButtonView.bind( 'isEnabled' ).to( command );
	}
}

function getFormValidators( t, mediaRegistry ) {
	return [
		form => {
			if ( !form.url.length ) {
				return t( 'The URL must not be empty.' );
			}
		},
		form => {
			if ( !mediaRegistry.hasMedia( form.url ) ) {
				return t( 'This media URL is not supported.' );
			}
		}
	];
}
