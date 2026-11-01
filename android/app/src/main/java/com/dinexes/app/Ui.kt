package com.dinexes.app

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout

/** Small helpers so screens are built in code with one consistent look. */
object Ui {
    const val NAVY = 0xFF131B2B.toInt()
    const val INK = 0xFF121826.toInt()
    const val PAPER = 0xFFFBF8F2.toInt()
    const val IVORY = 0xFFF4EEE2.toInt()
    const val LINE = 0xFFE2D9C7.toInt()
    const val MUTED = 0xFF6A6355.toInt()
    const val AMBER = 0xFFD29B3A.toInt()
    const val OK = 0xFF2E7A57.toInt()
    const val BAD = 0xFFB2412F.toInt()

    fun Context.dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    fun text(ctx: Context, s: String, size: Float = 15f, color: Int = INK, bold: Boolean = false): TextView =
        TextView(ctx).apply {
            text = s
            textSize = size
            setTextColor(color)
            if (bold) typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            setLineSpacing(0f, 1.15f)
        }

    fun title(ctx: Context, s: String, color: Int = INK): TextView =
        text(ctx, s, 27f, color, true).apply { typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD) }

    fun button(ctx: Context, label: String, style: String = "primary", onClick: () -> Unit): MaterialButton =
        MaterialButton(ctx).apply {
            text = label
            isAllCaps = false
            textSize = 16f
            cornerRadius = ctx.dp(12)
            minHeight = ctx.dp(54)
            insetTop = 0
            insetBottom = 0
            when (style) {
                "primary" -> { backgroundTintList = ColorStateList.valueOf(AMBER); setTextColor(INK) }
                "dark" -> { backgroundTintList = ColorStateList.valueOf(NAVY); setTextColor(IVORY) }
                else -> {
                    backgroundTintList = ColorStateList.valueOf(Color.WHITE)
                    setTextColor(INK)
                    strokeColor = ColorStateList.valueOf(LINE)
                    strokeWidth = ctx.dp(1)
                }
            }
            setOnClickListener { onClick() }
        }

    fun field(ctx: Context, hint: String, type: Int = InputType.TYPE_CLASS_TEXT, password: Boolean = false): Pair<TextInputLayout, TextInputEditText> {
        val layout = TextInputLayout(ctx, null, com.google.android.material.R.attr.textInputOutlinedStyle).apply {
            this.hint = hint
            boxBackgroundMode = TextInputLayout.BOX_BACKGROUND_OUTLINE
            setBoxCornerRadii(ctx.dp(10).toFloat(), ctx.dp(10).toFloat(), ctx.dp(10).toFloat(), ctx.dp(10).toFloat())
            boxStrokeColor = INK
            if (password) endIconMode = TextInputLayout.END_ICON_PASSWORD_TOGGLE
        }
        val edit = TextInputEditText(layout.context).apply {
            inputType = if (password) InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD else type
            textSize = 16f
            setSingleLine()
        }
        layout.addView(edit)
        return layout to edit
    }

    fun card(ctx: Context, bg: Int = Color.WHITE, stroke: Int = LINE): LinearLayout =
        LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable().apply {
                setColor(bg)
                cornerRadius = ctx.dp(14).toFloat()
                setStroke(ctx.dp(1), stroke)
            }
            setPadding(ctx.dp(16), ctx.dp(14), ctx.dp(16), ctx.dp(14))
        }

    fun column(ctx: Context): LinearLayout = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }

    fun space(ctx: Context, h: Int): View = View(ctx).apply { layoutParams = LinearLayout.LayoutParams(1, ctx.dp(h)) }

    fun LinearLayout.add(v: View, top: Int = 0): View {
        val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        lp.topMargin = context.dp(top)
        addView(v, lp)
        return v
    }

    fun center(v: TextView): TextView = v.apply { gravity = Gravity.CENTER }
}
