
(function($) {

    $(document).ready(function() {

        // Configuration
        var configDiv = $('#z__docstore_comments_configuration')[0],
            displayedVersion = configDiv.getAttribute('data-displayedversion')*1,
            viewingComments = !!configDiv.getAttribute('data-view'),
            onlyViewingCommentsForForm = configDiv.getAttribute('data-onlyform'),
            canAddComment = !!configDiv.getAttribute('data-add'),
            commentServerUrl = configDiv.getAttribute('data-url'),
            isViewer = !!configDiv.getAttribute('data-isviewer'),
            filterOn = configDiv.getAttribute('data-filter') === "1",
            showingChanges = configDiv.getAttribute('data-changes') === "1",
            privateCommentsEnabled = configDiv.getAttribute('data-privatecommentsenabled'),
            addPrivateCommentLabel = configDiv.getAttribute('data-addprivatecommentlabel'),
            privateCommentMessage = configDiv.getAttribute('data-privatecommentmessage');

        // ------------------------------------------------------------------

        var userNameLookup = {};

        var displayComment = function(formId, uname, comment, insertAtTop) {
            var element = $('#'+formId+' div[data-uname="'+uname+'"]');
            var div = $('<div class="z__docstore_comment_container"></div>');
            var header = $('<div class="z__docstore_comment_header"></div>');
            div.append(header);
            header.append(comment.datetimeTemplate);
            header.append($('<div></div>', {
                "class": "z__docstore_comment_username",
                text: (userNameLookup[comment.uid]||'')
            }));
            _.each(comment.comment.split(/[\r\n]+/), function(p) {
                p = $.trim(p);
                if(p) { div.append($("<p></p>", {text:p})); }
            });
            var versionMsg;
            if(comment.version < displayedVersion) {
                div.addClass("z__docstore_comment_previous_version");
                versionMsg = 'This comment refers to a previous version of this form.';
            } else if(comment.version > displayedVersion) {
                div.addClass("z__docstore_comment_later_version");
                versionMsg = 'This comment refers to a later version of this form.';
            }
            var privateMsg;
            if(comment.isPrivate) {
                div.addClass("z__docstore_private_comment");
                privateMsg = _.escape(privateCommentMessage);
            }
            if(versionMsg || privateMsg) {
                var messageDiv = '<div class="z__docstore_comment_different_version_msg">';
                messageDiv += privateMsg ? privateMsg : '';
                messageDiv += privateMsg && versionMsg ? '<br>': '';
                messageDiv += versionMsg ? versionMsg : '';
                header.append(messageDiv);
            }
            if(insertAtTop) {
                var existingComments = $('.z__docstore_comment_container', element);
                if(existingComments.length) {
                    existingComments.first().before(div);
                    return;
                }
            }
            element.append(div);
        };

        // ------------------------------------------------------------------

        var showComments = isViewer ? configDiv.getAttribute('data-showcomments') === "1" : viewingComments;
        if(showComments) {
            var data = {t:(new Date()).getTime()}; // help prevent naughty browsers caching
            if(onlyViewingCommentsForForm) {
                data.onlyform = onlyViewingCommentsForForm;
            }
            $.ajax(commentServerUrl, {
                data: data,
                dataType: "json",
                success: function(data) {
                    if(data.result !== "success") {
                        window.alert("Failed to load comments");
                        return;
                    }
                    userNameLookup = data.users || {};
                    var hasCommentsToDisplay = false;
                    _.each(data.forms, function(elements, formId) {
                        _.each(elements, function(comments, uname) {
                            _.each(comments, function(comment) {
                                displayComment(formId, uname, comment);
                                hasCommentsToDisplay = true;
                            });
                        });
                    });
                    if(!hasCommentsToDisplay) {
                        $('#z__no_comments_warning').show();
                    }
                    if(!filterOn) {
                        $('div[data-uname]').show();
                    } else {
                        var containers = [];
                        $('div[data-uname]').each(function() {
                            if($('div[data-uname]',this).length) {
                                containers.push(this);
                            } else {
                                // if not showing changes, need to hide if no comments
                                if($('.z__docstore_comment_container',this).length === 0 && !showingChanges) {
                                    $(this).hide();
                                // if showing changes, need to un hide if has comments
                                } else if ($('.z__docstore_comment_container',this).length !== 0 && showingChanges) {
                                    $(this).show();
                                }
                            }
                        });
                        // Now go through the containers, and if there's nothing visible within the container, hide it entirely.
                        // In reverse so parent containers can be hidden if all child containers are
                        _.each(containers.reverse(), function(container) {
                            if($('div[data-uname]:visible',container).length === 0) {
                                $(container).hide();
                            }
                        });
                    }
                }
            });
        }

        // ------------------------------------------------------------------

        // Adding comments
        if(canAddComment) {
            $('#z__docstore_body div[data-uname]').each(function() {
                // Ignore if this contains other elements with unames
                if($('[data-uname]',this).length) { return; }
                if(!/\S/.test(this.innerText||'')) { return; }  // no text/labels to comment on
                $(this).prepend('<div class="z__docstore_add_comment"><a class="z__docstore_add_comment_button" href="#" title="Add comment">Add comment<span></span></a></div>');
            });
            $('#z__docstore_body').on('click', '.z__docstore_add_comment_button', function(evt) {
                evt.preventDefault();

                var commentBoxHtml = '<div class="z__docstore_comment_enter_ui';
                commentBoxHtml += privateCommentsEnabled ? ' z__docstore_private_comment"' : '"'; // private by default if enabled
                commentBoxHtml += '><span><textarea rows="4"></textarea></span>';
                if(privateCommentsEnabled) {
                    commentBoxHtml += '<label><input type="checkbox" id="commment_is_private" name="private" value="yes" checked="checked">';
                    commentBoxHtml += _.escape(addPrivateCommentLabel);
                    commentBoxHtml += '</label>';
                }
                commentBoxHtml += '<div><a href="#" class="z__docstore_comment_enter_cancel">cancel</a> <input type="submit" value="Add comment"></div></div>';
                var commentBox = $(commentBoxHtml);

                var element = $(this).parents('[data-uname]').first();
                var existingComments = $('.z__docstore_comment_container', element);
                if(existingComments.length) {
                    existingComments.first().before(commentBox);
                } else {
                    element.append(commentBox);
                }
                $(this).hide(); // hide button to avoid
                window.setTimeout(function() { $('textarea',commentBox).focus(); }, 1);
            });

            // Cancel making comment
            $('#z__docstore_body').on('click', 'a.z__docstore_comment_enter_cancel', function(evt) {
                evt.preventDefault();
                var element = $(this).parents('[data-uname]').first();
                $('.z__docstore_comment_enter_ui', element).remove();
                $('.z__docstore_add_comment_button', element).show();
            });

            // Submit a comment
            $('#z__docstore_body').on('click', '.z__docstore_comment_enter_ui input[type=submit]', function(evt) {
                evt.preventDefault();
                var element = $(this).parents('[data-uname]').first();
                var comment = $.trim($('textarea', element).val());
                var isPrivate = element.find("#commment_is_private").first().is(":checked");
                $('.z__docstore_comment_enter_ui', element).remove();
                $('.z__docstore_add_comment_button', element).show();

                if(comment) {
                    var formId = element.parents('.z__docstore_form_display').first()[0].id,
                        uname = element[0].getAttribute('data-uname');
                    $.ajax(commentServerUrl, {
                        method: "POST",
                        data: {
                            __: $('#z__docstore_comments_configuration input[name=__]')[0].value,   // CSRF token
                            version: displayedVersion,
                            form: formId,
                            uname: uname,
                            comment: comment,
                            private: isPrivate
                        },
                        dataType: "json",
                        success: function(data) {
                            if(data.result !== "success") {
                                window.alert("Failed to add comment");
                                return;
                            }
                            userNameLookup[data.comment.uid] = data.commentUserName;
                            displayComment(formId, uname, data.comment, true /* at top, so reverse ordered by date to match viewing */);
                        }
                    });
                }
            });

            // Reflect privacy of comment
            $('#z__docstore_body').on('click', '.z__docstore_comment_enter_ui input[type=checkbox]', function() {
                var element = $(this).parents("div.z__docstore_comment_enter_ui").first();
                if($(this).is(":checked")) {
                    element.addClass("z__docstore_private_comment");
                } else {
                    element.removeClass("z__docstore_private_comment");
                }
            });

        }

    });

})(jQuery);
