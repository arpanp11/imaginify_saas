'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  aspectRatioOptions,
  defaultValues,
  transformationTypes,
} from '@/constants';
import { CustomField } from './CustomField';
import { use, useState, useTransition } from 'react';
import { AspectRatioKey, debounce, deepMergeObjects } from '@/lib/utils';
import { updateCredits } from '@/lib/actions/user.actions';

export const formSchema = z.object({
  title: z.string(),
  aspectRatio: z.string().optional(),
  color: z.string().optional(),
  propmpt: z.string().optional(),
  publicId: z.string(),
});

const TransformationForm = ({
  action,
  data = null,
  userId,
  type,
  creditBalance,
  config = null,
}: TransformationFormProps) => {
  const transformationType = transformationTypes[type];
  const [image, setImage] = useState(data);
  const [newTransformation, setNewTransformation] =
    useState<Transformations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformationConfig, setTransformationConfig] = useState(config);
  const [isPendding, startTransition] = useTransition();

  const initialValues =
    data && action === 'Update'
      ? {
          title: data?.title,
          aspectRatio: data?.aspectRatio,
          color: data?.color,
          prompt: data?.prompt,
          publicId: data?.publicId,
        }
      : defaultValues;

  // step 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  // step 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  /**
   * Handles selecting a field from the aspect ratio dropdown.
   * Updates the image state with the new aspect ratio.
   * Sets the new transformation to the config for the current transformation type.
   * Calls the onChangeField callback with the new value.
   */
  const onSelectFieldHandler = (
    value: string,
    onChangeField: (value: string) => void
  ) => {
    const imageSize = aspectRatioOptions[value as AspectRatioKey];

    setImage((prevImage: any) => ({
      ...prevImage,
      aspectRatio: imageSize.aspectRatio,
      width: imageSize.width,
      height: imageSize.height,
    }));

    setNewTransformation(transformationType.config);

    return onChangeField(value);
  };

  /**
   * Handles updating the transformation config when an input field changes.
   * Debounces the update to avoid unnecessary rerenders.
   * Updates the newTransformation state with the changed field.
   * Calls the onChangeField callback with the new value.
   */
  const onInputChangeHandler = (
    fieldName: string,
    value: string,
    type: string,
    onChangeField: (value: string) => void
  ) => {
    debounce(() => {
      setNewTransformation((prevState: any) => ({
        ...prevState,
        [type]: {
          ...prevState?.[type],
          [fieldName === 'prompt' ? 'prompt' : 'to']: value,
        },
      }));

      return onChangeField(value);
    }, 1000);
  };

  /**
   * Handles transforming the image when the transform button is clicked.
   * Sets isTransforming to true to show a loading state.
   * Merges the newTransformation with the existing transformationConfig.
   * Clears the newTransformation state.
   * Calls startTransition to transition to the new transformed image.
   * Calls updateCredits to deduct credits for the transformation.
   */
  const onTransformHandler = async () => {
    setIsTransforming(true);

    setTransformationConfig(
      deepMergeObjects(newTransformation, transformationConfig)
    );

    setNewTransformation(null);
    startTransition(async () => {
      //   await updateCredits(userId, creditFee);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <CustomField
          control={form.control}
          name='title'
          formLabel='Image Title'
          className='w-full'
          render={({ field }) => <Input {...field} />}
        />

        {/* generative fill */}
        {type === 'fill' && (
          <CustomField
            control={form.control}
            name='aspectRatio'
            formLabel='Aspect Ratio'
            className='w-full'
            render={({ field }) => (
              <Select
                onValueChange={(value) =>
                  onSelectFieldHandler(value, field.onChange)
                }
              >
                <SelectTrigger className='select-field'>
                  <SelectValue
                    placeholder='
                  Select size'
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(aspectRatioOptions).map((key) => (
                    <SelectItem key={key} value={key} className='select-item'>
                      {aspectRatioOptions[key as AspectRatioKey].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}

        {/* object remove/recolor */}
        {(type === 'remove' || type === 'recolor') && (
          <div className='prompt-field'>
            <CustomField
              control={form.control}
              name='prompt'
              formLabel={
                type === 'remove' ? 'Object to Remove' : 'Color to Recolor'
              }
              className='w-full'
              render={({ field }) => (
                <Input
                  value={field.value}
                  className='input-field'
                  onChange={(e) =>
                    onInputChangeHandler(
                      'prompt',
                      e.target.value,
                      type,
                      field.onChange
                    )
                  }
                />
              )}
            />

            {/* obnect recolor */}
            {type === 'recolor' && (
              <CustomField
                control={form.control}
                name='color'
                formLabel='Replacement Color'
                className='w-full'
                render={({ field }) => (
                  <Input
                    value={field.value}
                    className='input-field'
                    onChange={(e) =>
                      onInputChangeHandler(
                        'color',
                        e.target.value,
                        'recolor',
                        field.onChange
                      )
                    }
                  />
                )}
              />
            )}
          </div>
        )}

        <div className='flex flex-col gap-4'>
          {/*  transforming button */}
          <Button
            type='button'
            className='submit-button capitalize'
            disabled={isTransforming || newTransformation === null}
            onClick={onTransformHandler}
          >
            {isTransforming ? 'Transforming...' : 'Apply Transformation'}
          </Button>

          {/* submit button */}
          <Button
            type='submit'
            className='submit-button capitalize'
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Save Image'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TransformationForm;
